from typing import Optional, List
from pydantic import Field
from .base import ApolloModel

class OrganizationJobPostingsQuery(ApolloModel):
    organization_id: str = Field(description="The organization ID of the company for which you want to find job postings. Each company in the Apollo database is assigned a unique ID. To find IDs, call the [Organization Search endpoint](/reference/organization-search) and identify the values for `organization_id`. Example: `5e66b6381e05b4008c8331b8`")

class OrganizationJobPosting(ApolloModel):
    id: Optional[str] = Field(default=None, description="id")
    title: Optional[str] = Field(default=None, description="title")
    url: Optional[str] = Field(default=None, description="url")
    city: Optional[str] = Field(default=None, description="city")
    state: Optional[str] = Field(default=None, description="state")
    country: Optional[str] = Field(default=None, description="country")
    last_seen_at: Optional[str] = Field(default=None, description="last_seen_at")
    posted_at: Optional[str] = Field(default=None, description="posted_at")

class OrganizationJobPostingsResponse(ApolloModel):
    organization_job_postings: List[OrganizationJobPosting] = Field(default_factory=list, description="organization_job_postings")
