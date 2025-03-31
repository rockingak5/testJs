const moduleAlias = require('module-alias')
const path = require('path')

moduleAlias.addAliases({
	'~config': path.resolve(__dirname, 'backend', 'config'),
	'~controllers': path.resolve(__dirname, 'backend', 'controllers'),
	'~dev_ops': path.resolve(__dirname, 'backend', 'dev_ops'),
	'~enums': path.resolve(__dirname, 'backend', 'enums'),
	'~loaders': path.resolve(__dirname, 'backend', 'loaders'),
	'~middlewares': path.resolve(__dirname, 'backend', 'middlewares'),
	'~migrations': path.resolve(__dirname, 'backend', 'migrations'),
	'~models': path.resolve(__dirname, 'backend', 'models'),
	'~router': path.resolve(__dirname, 'backend', 'router'),
	'~schemas': path.resolve(__dirname, 'backend', 'schemas'),
	'~seeders': path.resolve(__dirname, 'backend', 'seeders'),
	'~services': path.resolve(__dirname, 'backend', 'services'),
	'~types': path.resolve(__dirname, 'backend', 'types'),
	'~utilities': path.resolve(__dirname, 'backend', 'utilities')
})

moduleAlias()
