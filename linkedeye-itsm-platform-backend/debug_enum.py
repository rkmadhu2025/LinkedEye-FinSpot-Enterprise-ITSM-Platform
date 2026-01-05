
import sys
sys.path.append('/app')
from app.models.incident import IncidentPriority

print(f"Type: {type(IncidentPriority.CRITICAL)}")
print(f"Value: {IncidentPriority.CRITICAL.value}")
print(f"Name: {IncidentPriority.CRITICAL.name}")
print(f"Str: {str(IncidentPriority.CRITICAL)}")
