# Introduction

experiment postgresql B-tree index performance when index is created by Primary key.
There are three PK to compare with those index performance

1. random uuid
2. sequential uuid
3. sequential integer

## requirement

[ ] installed k6
[ ] installed k6 extension dotenv and [postgresql-driver](https://github.com/grafana/xk6-sql-driver-postgres)
[ ] Set .env

## Running

```bash
node init_db.js && node run_bench.js && node print_result.js
```

### Trouble shooting
