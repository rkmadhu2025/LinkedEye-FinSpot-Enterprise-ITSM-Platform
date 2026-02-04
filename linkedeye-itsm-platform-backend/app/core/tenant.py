"""
Multi-Tenant Filtering Module.

Provides dependencies and utilities for tenant/client-based data isolation.
Admin users can see all data or filter by client; regular users only see their client's data.
"""

from typing import Optional, TypeVar, Generic, List
from uuid import UUID
from contextvars import ContextVar

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Client

# Context variable to store current tenant ID
current_tenant_id: ContextVar[Optional[UUID]] = ContextVar("current_tenant_id", default=None)


class TenantContext:
    """
    Context class that holds tenant information for the current request.
    """

    def __init__(
        self,
        user: User,
        client_id: Optional[UUID] = None,
        is_admin: bool = False,
        client: Optional[Client] = None
    ):
        self.user = user
        self.client_id = client_id
        self.is_admin = is_admin
        self.client = client

    @property
    def has_tenant(self) -> bool:
        """Check if a tenant is set."""
        return self.client_id is not None

    @property
    def can_see_all(self) -> bool:
        """Check if user can see all clients' data."""
        return self.is_admin and self.client_id is None


async def get_tenant_context(
    x_client_id: Optional[str] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TenantContext:
    """
    Dependency that provides tenant context for the current request.

    - Admin users can optionally specify X-Client-ID header to filter by client
    - Non-admin users are always filtered to their own client
    - Returns TenantContext with client information

    Usage:
        @router.get("/items")
        async def list_items(tenant: TenantContext = Depends(get_tenant_context)):
            if tenant.can_see_all:
                # Return all items
            else:
                # Filter by tenant.client_id
    """
    is_admin = getattr(current_user, "is_admin", False)
    user_client_id = getattr(current_user, "client_id", None)

    # Determine the effective client ID
    effective_client_id: Optional[UUID] = None
    client: Optional[Client] = None

    if is_admin:
        # Admin can specify a client via header, or see all
        if x_client_id:
            try:
                effective_client_id = UUID(x_client_id)
                client = db.query(Client).filter(Client.id == effective_client_id).first()
                if not client:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Client not found"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid client ID format"
                )
    else:
        # Non-admin users are restricted to their client
        if user_client_id:
            effective_client_id = user_client_id
            client = db.query(Client).filter(Client.id == user_client_id).first()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not assigned to any client"
            )

    # Set context variable
    current_tenant_id.set(effective_client_id)

    return TenantContext(
        user=current_user,
        client_id=effective_client_id,
        is_admin=is_admin,
        client=client
    )


async def get_optional_tenant_context(
    x_client_id: Optional[str] = Header(None, alias="X-Client-ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TenantContext:
    """
    Similar to get_tenant_context but doesn't require a client for non-admin users
    who don't have one assigned (returns None for client_id).
    """
    is_admin = getattr(current_user, "is_admin", False)
    user_client_id = getattr(current_user, "client_id", None)

    effective_client_id: Optional[UUID] = None
    client: Optional[Client] = None

    if is_admin and x_client_id:
        try:
            effective_client_id = UUID(x_client_id)
            client = db.query(Client).filter(Client.id == effective_client_id).first()
        except ValueError:
            pass
    elif not is_admin and user_client_id:
        effective_client_id = user_client_id
        client = db.query(Client).filter(Client.id == user_client_id).first()

    current_tenant_id.set(effective_client_id)

    return TenantContext(
        user=current_user,
        client_id=effective_client_id,
        is_admin=is_admin,
        client=client
    )


def apply_tenant_filter(query: Query, model, tenant: TenantContext) -> Query:
    """
    Apply tenant filter to a SQLAlchemy query.

    Args:
        query: SQLAlchemy query object
        model: Model class that has client_id column
        tenant: TenantContext from dependency

    Returns:
        Filtered query

    Usage:
        query = db.query(Incident)
        query = apply_tenant_filter(query, Incident, tenant)
    """
    if tenant.can_see_all:
        return query

    if tenant.client_id and hasattr(model, "client_id"):
        return query.filter(model.client_id == tenant.client_id)

    return query


def get_tenant_filter(model, tenant: TenantContext):
    """
    Get a filter condition for tenant isolation.

    Args:
        model: Model class that has client_id column
        tenant: TenantContext from dependency

    Returns:
        SQLAlchemy filter condition or True if no filter needed

    Usage:
        query = db.query(Incident).filter(
            Incident.status == "open",
            get_tenant_filter(Incident, tenant)
        )
    """
    if tenant.can_see_all:
        return True

    if tenant.client_id and hasattr(model, "client_id"):
        return model.client_id == tenant.client_id

    return True


class TenantAwareQuery:
    """
    Helper class for building tenant-aware queries.

    Usage:
        taq = TenantAwareQuery(db, Incident, tenant)
        incidents = taq.filter(Incident.status == "open").all()
    """

    def __init__(self, db: Session, model, tenant: TenantContext):
        self.db = db
        self.model = model
        self.tenant = tenant
        self._query = db.query(model)

        # Apply tenant filter
        if not tenant.can_see_all and tenant.client_id and hasattr(model, "client_id"):
            self._query = self._query.filter(model.client_id == tenant.client_id)

    def filter(self, *args):
        """Add additional filters."""
        self._query = self._query.filter(*args)
        return self

    def order_by(self, *args):
        """Add ordering."""
        self._query = self._query.order_by(*args)
        return self

    def limit(self, n: int):
        """Limit results."""
        self._query = self._query.limit(n)
        return self

    def offset(self, n: int):
        """Offset results."""
        self._query = self._query.offset(n)
        return self

    def first(self):
        """Get first result."""
        return self._query.first()

    def all(self) -> List:
        """Get all results."""
        return self._query.all()

    def count(self) -> int:
        """Get count of results."""
        return self._query.count()

    def exists(self) -> bool:
        """Check if any results exist."""
        return self._query.first() is not None

    @property
    def query(self) -> Query:
        """Get the underlying query object."""
        return self._query


def set_entity_client(entity, tenant: TenantContext) -> None:
    """
    Set the client_id on an entity when creating.

    Args:
        entity: Model instance to set client on
        tenant: TenantContext from dependency
    """
    if hasattr(entity, "client_id"):
        if tenant.client_id:
            entity.client_id = tenant.client_id
        elif not tenant.is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create entity without a client context"
            )


def validate_entity_access(entity, tenant: TenantContext) -> None:
    """
    Validate that the user has access to a specific entity.

    Args:
        entity: Model instance to check
        tenant: TenantContext from dependency

    Raises:
        HTTPException: If access is denied
    """
    if tenant.can_see_all:
        return

    entity_client_id = getattr(entity, "client_id", None)

    if tenant.client_id and entity_client_id:
        if entity_client_id != tenant.client_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this resource"
            )
