"""
LinkedEye FinSpot ITSM Platform - Python Frontend
Flask-based frontend application
"""
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import requests
import os
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Configure logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
app.logger.setLevel(logging.INFO)

# CORS configuration
CORS(app, supports_credentials=True)

# Backend API URL
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000/api/v1')
app.logger.info(f"Backend API URL configured: {API_BASE_URL}")


# Helper function to get auth token
def get_auth_token():
    """Get authentication token from session."""
    return session.get('access_token')


# Helper function to make API requests
def api_request(method, endpoint, data=None, params=None):
    """Make authenticated API request to backend."""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {
        'Content-Type': 'application/json'
    }
    
    token = get_auth_token()
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return None, {'detail': 'Invalid HTTP method'}
        
        if response.status_code == 401:
            # Token expired, clear session
            session.clear()
            return None, {'detail': 'Authentication required'}
        
        if response.status_code >= 400:
            try:
                error_data = response.json()
                # Extract detailed error message
                detail = error_data.get('detail', 'Unknown error')
                # Handle validation errors (FastAPI returns list of errors)
                if isinstance(detail, list):
                    errors = [f"{err.get('loc', [])[-1]}: {err.get('msg', '')}" for err in detail]
                    detail = '; '.join(errors)
                return None, {'detail': detail, 'status_code': response.status_code}
            except:
                return None, {'detail': f'HTTP {response.status_code} error: {response.text[:200]}', 'status_code': response.status_code}
        
        try:
            return response.json(), None
        except:
            return response.text, None
    
    except requests.exceptions.ConnectionError as e:
        return None, {'detail': f'Cannot connect to backend API at {API_BASE_URL}. Please check if the backend is running.', 'error_type': 'connection'}
    except requests.exceptions.Timeout as e:
        return None, {'detail': f'Request to {url} timed out. The backend may be slow or unavailable.', 'error_type': 'timeout'}
    except requests.exceptions.RequestException as e:
        return None, {'detail': f'Request failed: {str(e)}', 'error_type': 'request'}


# Authentication decorator
def login_required(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_auth_token():
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


# =====================================================
# AUTHENTICATION ROUTES
# =====================================================

@app.route('/')
def index():
    """Home page - redirect to dashboard if logged in."""
    if get_auth_token():
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page."""
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            return render_template('login.html', error='Email and password are required')
        
        data, error = api_request('POST', '/auth/login', data={
            'email': email,
            'password': password
        })
        
        if error:
            error_msg = error.get('detail', 'Login failed')
            # Add more context for connection errors
            if error.get('error_type') == 'connection':
                error_msg += f' (Backend URL: {API_BASE_URL})'
            app.logger.error(f"Login failed for {email}: {error_msg}")
            return render_template('login.html', error=error_msg)
        
        if not data or not data.get('access_token'):
            app.logger.error(f"Login response missing access_token for {email}")
            return render_template('login.html', error='Invalid response from server')
        
        # Store tokens in session
        session['access_token'] = data.get('access_token')
        session['refresh_token'] = data.get('refresh_token')
        session['user_email'] = email
        
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registration page."""
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        
        if not all([email, password, first_name, last_name]):
            return render_template('register.html', error='All fields are required')
        
        # Validate password length
        if len(password) < 8:
            return render_template('register.html', error='Password must be at least 8 characters long')
        
        data, error = api_request('POST', '/auth/register', data={
            'email': email,
            'password': password,
            'first_name': first_name,
            'last_name': last_name
        })
        
        if error:
            error_msg = error.get('detail', 'Registration failed')
            # Add more context for connection errors
            if error.get('error_type') == 'connection':
                error_msg += f' (Backend URL: {API_BASE_URL})'
            app.logger.error(f"Registration failed for {email}: {error_msg}")
            return render_template('register.html', error=error_msg)
        
        if data:
            app.logger.info(f"User registered successfully: {email}")
            return redirect(url_for('login'))
        else:
            return render_template('register.html', error='Registration failed: No response from server')
    
    return render_template('register.html')


@app.route('/logout')
def logout():
    """Logout and clear session."""
    token = get_auth_token()
    if token:
        api_request('POST', '/auth/logout')
    session.clear()
    return redirect(url_for('login'))


# =====================================================
# DASHBOARD ROUTES
# =====================================================

@app.route('/dashboard')
@login_required
def dashboard():
    """Dashboard page."""
    metrics, error = api_request('GET', '/dashboard/metrics')
    trends, _ = api_request('GET', '/dashboard/incident-trends?days=7')
    categories, _ = api_request('GET', '/dashboard/incident-categories')
    
    return render_template('dashboard.html',
                         metrics=metrics or {},
                         trends=trends or {},
                         categories=categories or {},
                         error=error)


# =====================================================
# INCIDENTS ROUTES
# =====================================================

@app.route('/incidents')
@login_required
def incidents():
    """Incidents list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    search = request.args.get('search')
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    if status:
        params['status'] = status
    if priority:
        params['priority'] = priority
    if search:
        params['search'] = search
    
    incidents_data, error = api_request('GET', '/incidents', params=params)
    stats, _ = api_request('GET', '/incidents/stats/summary')
    
    return render_template('incidents.html',
                         incidents=incidents_data or [],
                         stats=stats or {},
                         current_page=page,
                         limit=limit,
                         error=error)


@app.route('/incidents/<incident_id>')
@login_required
def incident_detail(incident_id):
    """Incident detail page."""
    incident, error = api_request('GET', f'/incidents/{incident_id}')
    
    if error:
        return render_template('error.html', error=error.get('detail', 'Incident not found')), 404
    
    return render_template('incident_detail.html', incident=incident)


@app.route('/incidents/create', methods=['GET', 'POST'])
@login_required
def create_incident():
    """Create incident page."""
    if request.method == 'POST':
        data = {
            'title': request.form.get('title'),
            'description': request.form.get('description'),
            'category': request.form.get('category'),
            'priority': request.form.get('priority', 'medium'),
            'impact': request.form.get('impact', 'medium'),
            'urgency': request.form.get('urgency', 'medium')
        }
        
        incident, error = api_request('POST', '/incidents', data=data)
        
        if error:
            return render_template('incident_create.html', error=error.get('detail', 'Failed to create incident'))
        
        return redirect(url_for('incident_detail', incident_id=incident.get('id')))
    
    return render_template('incident_create.html')


# =====================================================
# PROBLEMS ROUTES
# =====================================================

@app.route('/problems')
@login_required
def problems():
    """Problems list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    search = request.args.get('search')
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    if status:
        params['status'] = status
    if priority:
        params['priority'] = priority
    if search:
        params['search'] = search
    
    problems_data, error = api_request('GET', '/problems', params=params)
    
    return render_template('problems.html',
                         problems=problems_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


@app.route('/problems/<problem_id>')
@login_required
def problem_detail(problem_id):
    """Problem detail page."""
    problem, error = api_request('GET', f'/problems/{problem_id}')
    
    if error:
        return render_template('error.html', error=error.get('detail', 'Problem not found')), 404
    
    return render_template('problem_detail.html', problem=problem)


# =====================================================
# CHANGES ROUTES
# =====================================================

@app.route('/changes')
@login_required
def changes():
    """Changes list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    
    changes_data, error = api_request('GET', '/changes', params=params)
    
    return render_template('changes.html',
                         changes=changes_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


# =====================================================
# ASSETS ROUTES
# =====================================================

@app.route('/assets')
@login_required
def assets():
    """Assets list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    
    assets_data, error = api_request('GET', '/assets', params=params)
    
    return render_template('assets.html',
                         assets=assets_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


# =====================================================
# ALERTS ROUTES
# =====================================================

@app.route('/alerts')
@login_required
def alerts():
    """Alerts list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    severity = request.args.get('severity')
    status = request.args.get('status')
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    if severity:
        params['severity'] = severity
    if status:
        params['status'] = status
    
    alerts_data, error = api_request('GET', '/alerts', params=params)
    
    return render_template('alerts.html',
                         alerts=alerts_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


# =====================================================
# GROUPS ROUTES
# =====================================================

@app.route('/groups')
@login_required
def groups():
    """Groups list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    search = request.args.get('search')
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    if search:
        params['search'] = search
    
    groups_data, error = api_request('GET', '/groups', params=params)
    
    return render_template('groups.html',
                         groups=groups_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


# =====================================================
# NETWORK DEVICES ROUTES
# =====================================================

@app.route('/network-devices')
@login_required
def network_devices():
    """Network devices list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    search = request.args.get('search')
    device_type = request.args.get('device_type')
    status = request.args.get('status')
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    if search:
        params['search'] = search
    if device_type:
        params['device_type'] = device_type
    if status:
        params['status'] = status
    
    devices_data, error = api_request('GET', '/network-devices', params=params)
    
    return render_template('network_devices.html',
                         devices=devices_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


@app.route('/network-devices/<device_id>')
@login_required
def network_device_detail(device_id):
    """Network device detail page."""
    device, error = api_request('GET', f'/network-devices/{device_id}')
    
    if error:
        return render_template('error.html', error=error.get('detail', 'Device not found')), 404
    
    return render_template('network_device_detail.html', device=device)


# =====================================================
# NETWORK TOPOLOGY ROUTES
# =====================================================

@app.route('/network-topology')
@login_required
def network_topology():
    """Network topology page."""
    topology_id = request.args.get('id')
    
    if topology_id:
        topology, error = api_request('GET', f'/network-topology/{topology_id}')
        if error:
            return render_template('error.html', error=error.get('detail', 'Topology not found')), 404
        return render_template('network_topology.html', topology=topology)
    
    # Get list of topologies
    topologies_data, error = api_request('GET', '/network-topology')
    
    return render_template('network_topology.html',
                         topologies=topologies_data or [],
                         error=error)


# =====================================================
# REPORTS ROUTES
# =====================================================

@app.route('/reports')
@login_required
def reports():
    """Reports list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    search = request.args.get('search')
    report_type = request.args.get('report_type')
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    if search:
        params['search'] = search
    if report_type:
        params['report_type'] = report_type
    
    reports_data, error = api_request('GET', '/reports', params=params)
    
    return render_template('reports.html',
                         reports=reports_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


# =====================================================
# ANALYTICS ROUTES
# =====================================================

@app.route('/analytics')
@login_required
def analytics():
    """Analytics page."""
    models_data, _ = api_request('GET', '/analytics/models')
    recommendations_data, _ = api_request('GET', '/analytics/recommendations')
    anomalies_data, _ = api_request('GET', '/analytics/anomalies')
    
    return render_template('analytics.html',
                         models=models_data or [],
                         recommendations=recommendations_data or [],
                         anomalies=anomalies_data or [])


# =====================================================
# SETTINGS ROUTES
# =====================================================

@app.route('/settings')
@login_required
def settings():
    """Settings page."""
    category = request.args.get('category')
    
    params = {}
    if category:
        params['category'] = category
    
    settings_data, error = api_request('GET', '/settings', params=params)
    
    return render_template('settings.html',
                         settings=settings_data or [],
                         error=error)


# =====================================================
# INTEGRATIONS ROUTES
# =====================================================

@app.route('/integrations')
@login_required
def integrations():
    """Integrations list page."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    params = {
        'skip': (page - 1) * limit,
        'limit': limit
    }
    
    integrations_data, error = api_request('GET', '/integrations', params=params)
    
    return render_template('integrations.html',
                         integrations=integrations_data or [],
                         current_page=page,
                         limit=limit,
                         error=error)


@app.route('/integrations/<integration_id>')
@login_required
def integration_detail(integration_id):
    """Integration detail page."""
    integration, error = api_request('GET', f'/integrations/{integration_id}')
    
    if error:
        return render_template('error.html', error=error.get('detail', 'Integration not found')), 404
    
    return render_template('integration_detail.html', integration=integration)


# =====================================================
# CHANGES - ADDITIONAL ROUTES
# =====================================================

@app.route('/changes/calendar')
@login_required
def change_calendar():
    """Change calendar page."""
    changes_data, error = api_request('GET', '/changes')
    
    return render_template('change_calendar.html',
                         changes=changes_data or [],
                         error=error)


@app.route('/changes/<change_id>')
@login_required
def change_detail(change_id):
    """Change detail page."""
    change, error = api_request('GET', f'/changes/{change_id}')
    
    if error:
        return render_template('error.html', error=error.get('detail', 'Change not found')), 404
    
    return render_template('change_detail.html', change=change)


@app.route('/changes/create', methods=['GET', 'POST'])
@login_required
def change_create():
    """Create change page."""
    if request.method == 'POST':
        data = {
            'title': request.form.get('title'),
            'description': request.form.get('description'),
            'change_type': request.form.get('change_type', 'normal'),
            'priority': request.form.get('priority', 'medium'),
            'risk_level': request.form.get('risk_level', 'low')
        }
        
        change, error = api_request('POST', '/changes', data=data)
        
        if error:
            return render_template('change_create.html', error=error.get('detail', 'Failed to create change'))
        
        return redirect(url_for('change_detail', change_id=change.get('id')))
    
    return render_template('change_create.html')


# =====================================================
# ASSETS - ADDITIONAL ROUTES
# =====================================================

@app.route('/assets/create', methods=['GET', 'POST'])
@login_required
def asset_create():
    """Create asset page."""
    if request.method == 'POST':
        data = {
            'hostname': request.form.get('hostname'),
            'ip_address': request.form.get('ip_address'),
            'asset_type': request.form.get('asset_type'),
            'category': request.form.get('category'),
            'location': request.form.get('location'),
            'status': request.form.get('status', 'active')
        }
        
        asset, error = api_request('POST', '/assets', data=data)
        
        if error:
            return render_template('asset_create.html', error=error.get('detail', 'Failed to create asset'))
        
        return redirect(url_for('asset_detail', asset_id=asset.get('id')))
    
    return render_template('asset_create.html')


@app.route('/assets/<asset_id>')
@login_required
def asset_detail(asset_id):
    """Asset detail page."""
    asset, error = api_request('GET', f'/assets/{asset_id}')
    
    if error:
        return render_template('error.html', error=error.get('detail', 'Asset not found')), 404
    
    return render_template('asset_detail.html', asset=asset)


# =====================================================
# API ROUTES (for AJAX calls)
# =====================================================

@app.route('/api/incidents/<incident_id>', methods=['PUT'])
@login_required
def update_incident_api(incident_id):
    """Update incident via API."""
    data = request.get_json()
    result, error = api_request('PUT', f'/incidents/{incident_id}', data=data)
    
    if error:
        return jsonify(error), 400
    
    return jsonify(result)


@app.route('/api/alerts/<alert_id>/acknowledge', methods=['POST'])
@login_required
def acknowledge_alert_api(alert_id):
    """Acknowledge alert via API."""
    result, error = api_request('POST', f'/alerts/{alert_id}/acknowledge')
    
    if error:
        return jsonify(error), 400
    
    return jsonify(result)


# =====================================================
# ERROR HANDLERS
# =====================================================

@app.errorhandler(404)
def not_found(error):
    """404 error handler."""
    return render_template('error.html', error='Page not found'), 404


@app.errorhandler(500)
def internal_error(error):
    """500 error handler."""
    return render_template('error.html', error='Internal server error'), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
