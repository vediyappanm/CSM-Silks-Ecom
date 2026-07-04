from rest_framework.permissions import BasePermission


class IsStaffAdmin(BasePermission):
    """Allow staff users and role-based admins (matches login + WebSocket checks)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "is_staff_admin", False))
