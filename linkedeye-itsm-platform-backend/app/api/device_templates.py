
import os
import re
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

router = APIRouter()

# Path to the templates directory
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iframeGraphs")

# Initialize Jinja2 environment
env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(['html', 'xml'])
)

def parse_filename(filename: str) -> Dict[str, str]:
    """
    Parses a filename to extract vendor, model, and inferred layer.
    Examples:
    - Cisco_2960_G.j2 -> Vendor: Cisco, Model: 2960 G, Layer: e_swi
    - fortigate_firewall_60F.j2 -> Vendor: Fortinet, Model: 60F, Layer: f_swi
    - Huawei_S5720_32X_EI_AC.j2 -> Vendor: Huawei, Model: S5720 32X EI AC, Layer: e_swi
    """
    name = filename.replace('.j2', '')
    lower_name = name.lower()
    
    vendor = "Other"
    layer = "e_swi" # Default to switch
    model = name.replace('_', ' ')

    # Vendor detection
    if "cisco" in lower_name:
        vendor = "cisco"
        model = name.replace("Cisco_", "").replace("cisco_", "").replace('_', ' ')
    elif "fortigate" in lower_name or "fortinet" in lower_name:
        vendor = "fortigate"
        model = name.replace("fortigate_firewall_", "").replace("fortigate_", "").replace('_', ' ')
    elif "huawei" in lower_name:
        vendor = "huawei"
        model = name.replace("Huawei_", "").replace('_', ' ')
    elif "arista" in lower_name:
        vendor = "arista"
        model = name.replace("arista_", "").replace('_', ' ')
    elif "aruba" in lower_name:
        vendor = "aruba"
        model = name.replace("Aruba_", "").replace('_', ' ')
    elif "dell" in lower_name:
        vendor = "dell"
        model = name.replace("Dell_", "").replace('_', ' ')
    elif "juniper" in lower_name:
        vendor = "juniper"
        model = name.replace("Juniper_", "").replace('_', ' ')
    elif "hpe" in lower_name:
        vendor = "hpe"
        model = name.replace("HPE_", "").replace('_', ' ')
    elif "barracuda" in lower_name:
        vendor = "barracuda"
        model = name.replace("BARRACUDA_", "").replace('_', ' ')
    elif "big_ip" in lower_name or "f5" in lower_name:
        vendor = "f5"
        model = name.replace("BIG_IP_", "").replace('_', ' ')
    elif "radware" in lower_name:
        vendor = "radware"
        model = name.replace("radware_", "").replace('_', ' ')
    elif "netapp" in lower_name:
        vendor = "netapp"
        model = name.replace("NetApp_", "").replace('_', ' ')

    # Layer detection
    if "firewall" in lower_name or "ftd" in lower_name or "barracuda" in lower_name or "fortigate" in lower_name:
        layer = "f_swi"
    elif "router" in lower_name or "isr" in lower_name:
        layer = "r_swi"
    elif "load_balancer" in lower_name or "big_ip" in lower_name or "radware" in lower_name:
        layer = "f_swi" # Group LBs with security/edge for now or create new
    elif "server" in lower_name or "compute" in lower_name:
        layer = "s_hw"
    
    # Storage
    if "netapp" in lower_name or "storage" in lower_name:
        layer = "s_hw" # Or a new storage layer

    return {
        "filename": filename,
        "vendor": vendor,
        "model": model,
        "layer": layer
    }

@router.get("/list")
async def list_device_templates():
    """
    Lists all available device templates from the iframeGraphs directory.
    Returns a structured catalog.
    """
    if not os.path.exists(TEMPLATES_DIR):
        return {"f_swi": {}, "r_swi": {}, "e_swi": {}, "s_hw": {}}

    catalog = {
        "f_swi": {},
        "r_swi": {},
        "e_swi": {},
        "s_hw": {}
    }

    files = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.j2')]
    
    for f in files:
        info = parse_filename(f)
        layer = info["layer"]
        vendor = info["vendor"]
        
        if layer not in catalog:
            catalog[layer] = {}
        
        if vendor not in catalog[layer]:
            catalog[layer][vendor] = []
            
        catalog[layer][vendor].append({
            "model": info["model"],
            "filename": f,
            "series": vendor.capitalize(), # Simplified series
            "ports": 24 # Placeholder, would need to inspect file or have metadata to know real port count
        })

    return catalog

@router.get("/render/{filename}")
async def render_device_template(filename: str):
    """
    Renders a specific device template as SVG.
    """
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    template_path = os.path.join(TEMPLATES_DIR, filename)
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        template = env.get_template(filename)
        # Render with dummy data strictly for visualization
        # The templates use placeholders like __IP__, newip__IP__, etc.
        # We replace them with empty strings or IDs to create valid SVG
        rendered = template.render(
            IP="preview_id",
            __IP__="preview_id"
        )
        
        # Some templates might produce bare XML/SVG without headers, or wrapped in divs.
        # We might need to clean it up if it's meant to be used as an image source.
        # Based on Cisco_2960_G.j2 view, it has <legend>, <div>s and <svg>.
        # This structure is designed for embedding in an HTML page via iframe (hence iframeGraphs).
        # To use it as an image in the catalog, we ideally extract the <svg>...<svg> part.
        
        # However, for simplicity and robustness given we haven't seen all files, 
        # serving the full HTML might be safest if we use it in an iframe or object tag.
        # But the user asked for "design image".
        
        # Let's return HTML for now, which the frontend can embed.
        return HTMLResponse(content=rendered)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rendering template: {str(e)}")

@router.get("/svg/{filename}")
async def get_device_svg(filename: str):
    """
    Extracts and returns just the SVG part of the template if possible.
    """
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    try:
        template = env.get_template(filename)
        rendered = template.render(
            IP="preview_dev",
            __IP__="preview_dev"
        )
        
        # Simple extraction of SVG tag
        start = rendered.find("<svg")
        end = rendered.rfind("</svg>")
        
        if start != -1 and end != -1:
            svg_content = rendered[start:end+6]
            return Response(content=svg_content, media_type="image/svg+xml")
        else:
            # Fallback: wrap in a simple svg if none found (unlikely for graph templates)
            return Response(content=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50">No SVG found</text></svg>', media_type="image/svg+xml")
            
    except Exception as e:
        # Fallback error image
        return Response(content=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><text y="25" fill="red">Error</text></svg>', media_type="image/svg+xml")
