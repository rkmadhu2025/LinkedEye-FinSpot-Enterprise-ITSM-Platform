from app.models.user import User
from sqlalchemy import inspect

mapper = inspect(User)
print("Column mappings:")
for col in mapper.columns:
    print(f"  Database column: {col.name} -> Python attribute: {col.key}")
