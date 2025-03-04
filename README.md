# JSON.ms

![example](https://json.ms/meta-preview.jpg "Title")

JSON.ms allows you to create an admin panel from a YAML interface that communicates with a remote server using JSON. Users enjoy a sleek interface while you dynamically manage fields through YAML, handling all RESTful requests seamlessly from your server.

## Features
- Define admin panel UI using YAML
- Seamless communication with a remote server via JSON
- Dynamic field management
- RESTful API integration

## Installation

1. Clone the repository:
```sh
git clone git@github.com:dannycoulombe/jsonms.git
cd jsonms
```

2. Create a .env file based on .env.example available in the repo:
```sh
cp .env.example .env
```

3. Install dependencies:
```sh
# Using Yarn
yarn

# OR using npm
npm install
```

4. Start the development server:
```sh
# Using Yarn
yarn dev

# OR using npm
npm run dev
```

## Requirements
Ensure that the backend server ([jsonms-server](https://github.com/dannycoulombe/jsonms-server)) is up and running. See jsonms-server for setup instructions.

## License
BSD-3-Clause License
