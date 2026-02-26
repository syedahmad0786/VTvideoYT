from mcp.server.fastmcp import FastMCP
from apollo_client import ApolloClient
from apollo import *

import os

from dotenv import load_dotenv
load_dotenv()

apollo_client = ApolloClient(api_key=os.getenv("APOLLO_IO_API_KEY"))

mcp = FastMCP("Apollo.io")

@mcp.tool()
async def people_enrichment(query: PeopleEnrichmentQuery) -> Optional[dict]:
    """
    Use the People Enrichment endpoint to enrich data for 1 person.
    https://docs.apollo.io/reference/people-enrichment
    """
    result = await apollo_client.people_enrichment(query)
    return result.model_dump() if result else None

@mcp.tool()
async def organization_enrichment(query: OrganizationEnrichmentQuery) -> Optional[dict]:
    """
    Use the Organization Enrichment endpoint to enrich data for 1 company.
    https://docs.apollo.io/reference/organization-enrichment
    """
    result = await apollo_client.organization_enrichment(query)
    return result.model_dump() if result else None

@mcp.tool()
async def people_search(query: PeopleSearchQuery) -> Optional[dict]:
    """
    Use the People Search endpoint to find people.
    https://docs.apollo.io/reference/people-search
    """
    result = await apollo_client.people_search(query)
    return result.model_dump() if result else None

@mcp.tool()
async def organization_search(query: OrganizationSearchQuery) -> Optional[dict]:
    """
    Use the Organization Search endpoint to find organizations.
    https://docs.apollo.io/reference/organization-search
    """
    result = await apollo_client.organization_search(query)
    return result.model_dump() if result else None

@mcp.tool()
async def organization_job_postings(organization_id: str) -> Optional[dict]:
    """
    Use the Organization Job Postings endpoint to find job postings for a specific organization.
    https://docs.apollo.io/reference/organization-jobs-postings
    """
    result = await apollo_client.organization_job_postings(organization_id)
    return result.model_dump() if result else None

# if __name__ == "__main__":
#     mcp.run(transport="stdio")
