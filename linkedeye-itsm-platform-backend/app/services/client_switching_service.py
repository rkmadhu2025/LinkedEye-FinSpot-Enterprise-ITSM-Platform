"""
Client Switching Service for Multi-Tenant Context Management.

This service manages client context switching for users who have access to multiple clients.
It handles client visibility, access control, and context switching operations.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.client import Client, ClientStatus
from app.models.user import User, UserRole
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClientSwitchingService:
    """
    Service for managing client context switching and access control.
    
    This service provides functionality for:
    - Getting accessible clients for a user
    - Switching client context
    - Validating client access permissions
    - Managing client context in user sessions
    """

    def __init__(self, db: Session):
        self.db = db

    def get_user_clients(self, user_id: UUID) -> List[Client]:
        """
        Get all clients accessible to a user.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            List of Client objects the user can access
            
        Business Rules:
        - Admin users can access all active clients
        - Regular users can only access their assigned client
        - Inactive clients are excluded unless user is admin
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User not found: {user_id}")
            return []

        # Admin users can access all active clients
        if user.is_admin:
            clients = (
                self.db.query(Client)
                .filter(
                    Client.is_active == True,
                    Client.status == ClientStatus.ACTIVE
                )
                .order_by(Client.name)
                .all()
            )
            logger.info(f"Admin user {user_id} accessing {len(clients)} clients")
            return clients

        # Regular users can only access their assigned client
        if user.client_id:
            client = (
                self.db.query(Client)
                .filter(
                    Client.id == user.client_id,
                    Client.is_active == True
                )
                .first()
            )
            if client:
                logger.info(f"User {user_id} accessing assigned client: {client.client_code}")
                return [client]
            else:
                logger.warning(f"User {user_id} assigned to inactive client: {user.client_id}")
                return []

        # User has no client assignment
        logger.info(f"User {user_id} has no client assignment")
        return []

    def switch_client_context(self, user_id: UUID, client_id: UUID) -> bool:
        """
        Switch user's active client context.
        
        Args:
            user_id: UUID of the user
            client_id: UUID of the client to switch to
            
        Returns:
            True if context switch was successful, False otherwise
            
        Business Rules:
        - User must have access to the target client
        - Client must be active
        - Context switch is logged for audit purposes
        """
        # Validate user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"Cannot switch context: User not found: {user_id}")
            return False

        # Validate client access
        if not self.validate_client_access(user_id, client_id):
            logger.warning(f"Access denied: User {user_id} cannot access client {client_id}")
            return False

        # Validate client exists and is active
        client = (
            self.db.query(Client)
            .filter(
                Client.id == client_id,
                Client.is_active == True,
                Client.status == ClientStatus.ACTIVE
            )
            .first()
        )
        
        if not client:
            logger.error(f"Cannot switch context: Client not found or inactive: {client_id}")
            return False

        # For admin users, we don't update their client_id in the database
        # Instead, we rely on session/header-based context switching
        # For regular users, their client_id should already match
        
        # Update user's last activity
        user.last_activity_at = datetime.now(timezone.utc)
        
        try:
            self.db.commit()
            logger.info(
                f"Client context switched successfully",
                extra={
                    "user_id": str(user_id),
                    "client_id": str(client_id),
                    "client_code": client.client_code,
                    "is_admin": user.is_admin
                }
            )
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to switch client context: {e}")
            return False

    def validate_client_access(self, user_id: UUID, client_id: UUID) -> bool:
        """
        Validate if a user has access to a specific client.
        
        Args:
            user_id: UUID of the user
            client_id: UUID of the client
            
        Returns:
            True if user has access, False otherwise
            
        Business Rules:
        - Admin users have access to all active clients
        - Regular users only have access to their assigned client
        - Inactive clients are not accessible (except for admins)
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            return False

        # Admin users can access all clients (even inactive ones for management)
        if user.is_admin:
            return True

        # Regular users can only access their assigned client if it's active
        if user.client_id == client_id and client.is_active and client.status == ClientStatus.ACTIVE:
            return True

        return False

    def get_current_client(self, user_id: UUID) -> Optional[Client]:
        """
        Get the current client for a user.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Current Client object or None if no client assigned
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.client_id:
            return None

        client = (
            self.db.query(Client)
            .filter(Client.id == user.client_id)
            .first()
        )
        
        return client

    def get_client_context_info(self, user_id: UUID, client_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Get comprehensive client context information for a user.
        
        Args:
            user_id: UUID of the user
            client_id: Optional specific client ID to get info for
            
        Returns:
            Dictionary containing client context information
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        # Determine target client
        target_client_id = client_id or user.client_id
        if not target_client_id:
            return {
                "user_id": str(user_id),
                "is_admin": user.is_admin,
                "current_client": None,
                "accessible_clients": self.get_user_clients(user_id),
                "can_switch_clients": user.is_admin or len(self.get_user_clients(user_id)) > 1
            }

        current_client = self.db.query(Client).filter(Client.id == target_client_id).first()
        accessible_clients = self.get_user_clients(user_id)

        return {
            "user_id": str(user_id),
            "is_admin": user.is_admin,
            "current_client": {
                "id": str(current_client.id),
                "client_code": current_client.client_code,
                "name": current_client.name,
                "display_name": current_client.display_name or current_client.name,
                "environment": current_client.environment.value if current_client.environment else "production",
                "status": current_client.status.value if current_client.status else "active"
            } if current_client else None,
            "accessible_clients": [
                {
                    "id": str(client.id),
                    "client_code": client.client_code,
                    "name": client.name,
                    "display_name": client.display_name or client.name,
                    "environment": client.environment.value if client.environment else "production"
                }
                for client in accessible_clients
            ],
            "can_switch_clients": user.is_admin or len(accessible_clients) > 1,
            "has_client_access": self.validate_client_access(user_id, target_client_id) if target_client_id else False
        }

    def should_show_client_switcher(self, user_id: UUID) -> bool:
        """
        Determine if the client switcher UI should be shown for a user.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            True if client switcher should be shown, False otherwise
            
        Business Rules:
        - Show for admin users (they can access multiple clients)
        - Show for users with access to multiple clients
        - Hide for users with only one client or no clients
        """
        accessible_clients = self.get_user_clients(user_id)
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return False
            
        # Always show for admin users (they can potentially access all clients)
        if user.is_admin:
            return True
            
        # Show if user has access to multiple clients
        return len(accessible_clients) > 1

    def get_client_statistics(self, client_id: UUID) -> Dict[str, Any]:
        """
        Get statistics for a specific client.
        
        Args:
            client_id: UUID of the client
            
        Returns:
            Dictionary containing client statistics
        """
        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            return {"error": "Client not found"}

        # Import here to avoid circular imports
        from app.models.incident import Incident
        from app.models.problem import Problem
        from app.models.change import Change
        from app.models.asset import Asset
        from app.models.alert import Alert

        try:
            stats = {
                "client_id": str(client_id),
                "client_name": client.name,
                "user_count": self.db.query(User).filter(
                    User.client_id == client_id,
                    User.is_active == True
                ).count(),
                "incident_count": self.db.query(Incident).filter(
                    Incident.client_id == client_id
                ).count(),
                "open_incidents": self.db.query(Incident).filter(
                    Incident.client_id == client_id,
                    Incident.status.notin_(["resolved", "closed"])
                ).count(),
                "problem_count": self.db.query(Problem).filter(
                    Problem.client_id == client_id
                ).count(),
                "change_count": self.db.query(Change).filter(
                    Change.client_id == client_id
                ).count(),
                "asset_count": self.db.query(Asset).filter(
                    Asset.client_id == client_id
                ).count(),
                "active_alerts": self.db.query(Alert).filter(
                    Alert.client_id == client_id,
                    Alert.status.in_(["open", "acknowledged"])
                ).count()
            }
            return stats
        except Exception as e:
            logger.error(f"Error getting client statistics: {e}")
            return {"error": "Failed to retrieve statistics"}