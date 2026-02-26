from typing import Optional
import httpx
from pydantic import ValidationError

from apollo import *


class ApolloClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.apollo.io/api/v1"
        self.headers = {
            "accept": "application/json",
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

    async def people_enrichment(self, query: PeopleEnrichmentQuery) -> Optional[PeopleEnrichmentResponse]:
        """
        Use the People Enrichment endpoint to enrich data for 1 person.
        https://docs.apollo.io/reference/people-enrichment
        """
        url = f"{self.base_url}/people/match"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=query.model_dump(exclude_none=True), headers=self.headers)
            if response.status_code == 200:
                try:
                    return PeopleEnrichmentResponse(**response.json())
                except ValidationError as e:
                    print(f"Validation error in people_enrichment: {e}")
                    # Return raw data wrapped in a minimal response
                    return PeopleEnrichmentResponse.model_construct(**response.json())
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None

    async def organization_enrichment(self, query: OrganizationEnrichmentQuery) -> Optional[OrganizationEnrichmentResponse]:
        """
        Use the Organization Enrichment endpoint to enrich data for 1 company.
        https://docs.apollo.io/reference/organization-enrichment
        """
        url = f"{self.base_url}/organizations/enrich"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=query.model_dump(exclude_none=True), headers=self.headers)
            if response.status_code == 200:
                try:
                    return OrganizationEnrichmentResponse(**response.json())
                except ValidationError as e:
                    print(f"Validation error in organization_enrichment: {e}")
                    return OrganizationEnrichmentResponse.model_construct(**response.json())
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None

    async def people_search(self, query: PeopleSearchQuery) -> Optional[PeopleSearchResponse]:
        """
        Use the People Search endpoint to find people.
        https://docs.apollo.io/reference/people-search
        """
        url = f"{self.base_url}/mixed_people/search"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=query.model_dump(exclude_none=True), headers=self.headers)
            if response.status_code == 200:
                try:
                    return PeopleSearchResponse(**response.json())
                except ValidationError as e:
                    print(f"Validation error in people_search: {e}")
                    return PeopleSearchResponse.model_construct(**response.json())
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None

    async def organization_search(self, query: OrganizationSearchQuery) -> Optional[OrganizationSearchResponse]:
        """
        Use the Organization Search endpoint to find organizations.
        https://docs.apollo.io/reference/organization-search
        """
        url = f"{self.base_url}/mixed_companies/search"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=query.model_dump(exclude_none=True), headers=self.headers)
            if response.status_code == 200:
                try:
                    return OrganizationSearchResponse(**response.json())
                except ValidationError as e:
                    print(f"Validation error in organization_search: {e}")
                    return OrganizationSearchResponse.model_construct(**response.json())
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None

    async def organization_job_postings(self, organization_id: str) -> Optional[OrganizationJobPostingsResponse]:
        """
        Use the Organization Job Postings endpoint to find job postings for a specific organization.
        https://docs.apollo.io/reference/organization-jobs-postings
        """
        url = f"{self.base_url}/organizations/{organization_id}/job_postings"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            if response.status_code == 200:
                try:
                    return OrganizationJobPostingsResponse(**response.json())
                except ValidationError as e:
                    print(f"Validation error in organization_job_postings: {e}")
                    return OrganizationJobPostingsResponse.model_construct(**response.json())
            else:
                print(f"Error: {response.status_code} - {response.text}")
                return None
