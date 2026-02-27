from pydantic import BaseModel, ConfigDict


class ApolloModel(BaseModel):
    """Base model for all Apollo API responses.

    - extra='allow': accepts unknown fields from the API without crashing
    - This prevents validation errors when Apollo adds new fields or returns
      unexpected data shapes for different companies/contacts.
    """
    model_config = ConfigDict(extra="allow")
