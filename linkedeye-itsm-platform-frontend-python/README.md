# LinkedEye FinSpot ITSM Platform - Python Frontend

Flask-based frontend application matching the reference design system.

## Features

- ✅ **Python-based frontend** using Flask
- ✅ **Matches reference design** - Uses the same styling as reference HTML files
- ✅ **Server-side rendering** with Jinja2 templates
- ✅ **Session-based authentication**
- ✅ **Integration with FastAPI backend**
- ✅ **Responsive UI** matching reference design
- ✅ **JavaScript for charts** (Chart.js)

## Technology Stack

- **Backend API**: FastAPI (Python) - `http://localhost:8000`
- **Frontend**: Flask (Python) - `http://localhost:5000`
- **Templates**: Jinja2 (matching reference design)
- **Styling**: Custom CSS matching reference design system
- **Charts**: Chart.js
- **Icons**: Font Awesome

## Installation

1. **Create virtual environment:**
```bash
cd linkedeye-itsm-platform-frontend-python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set environment variables:**
```bash
# Create .env file (optional)
API_BASE_URL=http://localhost:8000/api/v1
SECRET_KEY=your-secret-key-here
```

4. **Run the application:**
```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Design System

The templates use the same design system as the reference HTML files:

- **Colors**: Primary navy (#0f1c3f), Blue (#2563eb), etc.
- **Sidebar**: Fixed navigation with navy background
- **Header**: Top bar with search and user menu
- **Cards**: Consistent card styling
- **Badges**: Color-coded status indicators
- **Typography**: Segoe UI font family

## Routes

### Authentication
- `GET/POST /login` - Login page (matches reference design)
- `GET/POST /register` - Registration page
- `GET /logout` - Logout

### Main Pages
- `GET /dashboard` - Dashboard with metrics and charts
- `GET /incidents` - Incidents list (matches reference design)
- `GET /incidents/<id>` - Incident detail
- `GET/POST /incidents/create` - Create incident
- `GET /problems` - Problems list
- `GET /problems/<id>` - Problem detail
- `GET /changes` - Changes list
- `GET /assets` - Assets list
- `GET /alerts` - Alerts list

## Configuration

The application connects to the FastAPI backend. Make sure the backend is running:

```bash
# In linkedeye-itsm-platform-backend directory
uvicorn app.main:app --reload
```

## Development

### Running in Development Mode

```bash
export FLASK_ENV=development
python app.py
```

### Production Deployment

For production, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Design Matching

The templates are designed to match the reference HTML files in the `reference/` folder:

- ✅ Same color scheme and CSS variables
- ✅ Same sidebar navigation structure
- ✅ Same header layout
- ✅ Same card and table styling
- ✅ Same badge and status indicators
- ✅ Same form styling

## Notes

- This frontend uses the **reference design system** from the `reference/` folder
- All templates match the visual style of the reference HTML files
- Both Python and React frontends can coexist and use the same backend API
- Choose the frontend that best fits your needs
