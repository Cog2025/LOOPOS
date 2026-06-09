from contextvars import ContextVar

current_user_context = ContextVar("current_user_context", default=None)
