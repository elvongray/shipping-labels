from decimal import Decimal

SERVICES = [
    {"code": "priority_mail", "name": "Priority Mail", "base_cents": 500, "per_oz": 10},
    {
        "code": "ground_shipping",
        "name": "Ground Shipping",
        "base_cents": 250,
        "per_oz": 5,
    },
]


def quote_for_weight(weight_oz: Decimal | None) -> list[dict]:
    if not weight_oz or weight_oz <= 0:
        return []

    quotes = []
    for service in SERVICES:
        price = service["base_cents"] + int(Decimal(service["per_oz"]) * weight_oz)
        quotes.append(
            {
                "service": service["code"],
                "name": service["name"],
                "price_cents": price,
            }
        )
    return quotes
