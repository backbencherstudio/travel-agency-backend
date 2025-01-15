# travel-agency-backend

Travel agency backend system created using nestjs

## Config

Stripe webhook:

```
http://{domain_name}/api/payment/stripe/webhook
```

for development run stripe cli:

```
stripe listen --forward-to localhost:4000/api/payment/stripe/webhook
```

trigger a event for testing:

```
stripe trigger invoice.payment_succeeded
```

## Installation

Install all dependencies

```
yarn install
```

Seed dummy data to database

```
yarn cmd seed
```

## Running:

Running in development:

```
yarn start:dev
```

or just directly run using docker:
```
docker compose up
```

Running in production:

First build the project.

```
yarn build
```

Then run.

```
yarn start:prod
```

## Tech used

- Typescript
- Node.js
- Nest.js
- Prisma
- Postgres
- etc.
