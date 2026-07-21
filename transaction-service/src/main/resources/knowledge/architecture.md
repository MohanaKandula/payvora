# PayVora System Architecture
## Purpose
Documents microservice architecture, API Gateway routing, database structure, and inter-service communications.

## Business Process
PayVora consists of 4 primary Spring Boot microservices: API Gateway (8080), Account Service (8081), Ledger Service (8082), and Transaction Service (8083).

## Dependencies
- Spring Cloud Gateway
- PostgreSQL Ledger DB
- Eureka / Microservice Routing

## Related Features
- Admin Operational Center
- RAG Vector Engine

## Common Operational Scenarios
- **Scenario: Service Timeout**: Inter-service request latency spike.
  - *Recommended Action*: Check microservice health endpoints and container logs.

## Recommended Actions
Maintain 99.99% uptime on API Gateway and Ledger Service.