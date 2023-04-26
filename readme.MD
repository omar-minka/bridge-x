# Steps

1- Run `yarn install`

2- Copy src/example.env to src/.env and replace values
 
3- Start database with `yarn start:infra`

4- Start bridge with `yarn start`


# Connecting to ledger

Connect to staging ledger

```bash
minka server connect
```
With
```bash
Server url: https://ika.ldg-stg.one/api/v2
```

Start an ngrok tunnel
```bash
# If you don't have ngrok installed you can do
yarn global add ngrok
# or
brew install ngrok
# then
ngrok http 3101 # 3100 is the port in src/.env
```

* 