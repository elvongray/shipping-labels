from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    message = "An error occurred"
    if isinstance(response.data, dict):
        if "detail" in response.data:
            message = response.data["detail"]
        elif "error" in response.data:
            message = response.data["error"]

    response.data = {
        "error": {
            "code": "VALIDATION_ERROR" if response.status_code == 400 else "ERROR",
            "message": message,
            "details": response.data,
        }
    }
    return response
