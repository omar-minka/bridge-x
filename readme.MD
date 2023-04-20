# Steps

1- Copy src/example.env to src/.env and replace values

2- Start database with `yarn start:infra`

3- Start bridge with `yarn start`


# Connecting to ledger

Connect to staging ledger

```bash
minka server connect https://ika.ldg-stg.one/api/v2
```

Start an ngrok tunnel
```bash
# If you don't have ngrok installed you can do
yarn global add ngrok
# or
brew install ngrok
# then
ngrok http 3100 # 3100 is the port in src/.env
```

Your bridge on ledger must have the url provided by ngrok plus `/v2` for example
`https://e590-185-254-254-73.ngrok-free.app/v2`