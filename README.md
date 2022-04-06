# ![navitia playground](https://rawgithub.com/hove-io/navitia-playground/master/img/n_playground.svg) [![Build status](https://travis-ci.org/hove-io/navitia-playground.svg?branch=master)](https://travis-ci.org/hove-io/navitia-playground)

Web UI for the [navitia](https://github.com/hove-io/navitia) API. You can get a token [here](http://www.navitia.io) and then use this UI [here](https://playground.navitia.io).

## Screenshots

![Request](screenshots/request.png) ![Response](screenshots/response.png)

## Setting your dev environment to contribute

### Requirements
- node v8.x LTS ([nvm](https://github.com/creationix/nvm) is recommanded for installing node)

### Installation
```bash
npm install && npx bower install
```

### Launch the application
```bash
npx gulp dev
```

### Troubleshooting

*   you may have troubles to install `npx` on some distributions. If you encounter errors like this:
    > npm WARN notsup Not compatible with your operating system or architecture: fsevents@1.2.9

    Try removing the `node_modules` directory, then launch `npm install && npm install --no-optional npx && ./node_modules/.bin/npx bower install`
    Then run `./node_modules/.bin/npx gulp dev` to launch the application

## License

This project is under the [MIT license](LICENSE). See the [bower file](bower.json) for the running dependencies and the [npm file](package.json) for dev dependencies.
