# Introduction

experiment postgresql B-tree index performance when index is created by Primary key.
There are three PK to compare with those index performance

1. random uuid
2. sequential uuid
3. sequential integer

# Running

## requirement

- installed k6
- installed k6 extension [dotenv](https://github.com/szkiba/xk6-dotenv) and [postgresql-driver](https://github.com/grafana/xk6-sql-driver-postgres)
- Set .env

## Command

- Test : Random UUID PK Effects

```bash
node init_db.js && node print_result.js && node run_bench.js && node print_result.js
```

- Test: Clustering Effects

```
node init_db.js && node print_result.js && node run_cluster.js && node print_result.js
```

## Result

- `./output/result{YYMMDD_hhmm}/test.txt` file show results of performance. it includes table IO, test query performance, table disk inspect and index disk inspect
- if success above command, you can see two `${YYMMDD_hhmm}` folder. one includes result before running test and the other includes result after test.

# Trouble shooting
