REPORTER = dot

test: lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha --reporter $(REPORTER)
	@$(MAKE) rm-lib-cov

lib-cov: rm-lib-cov
	@jscoverage lib lib-cov

rm-lib-cov:
	@rm -rf ./lib-cov/

test-cov: lib-cov
	@$(MAKE) test EXPRESS_COV=1 REPORTER=json-cov > coverage.json
	@$(MAKE) rm-lib-cov

test-cov-html: lib-cov
	@$(MAKE) test EXPRESS_COV=1 REPORTER=html-cov > coverage.html
	@$(MAKE) rm-lib-cov

tap: lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha -R tap > results.tap
	@$(MAKE) rm-lib-cov

unit: lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha -R xunit > results.xml
	@$(MAKE) rm-lib-cov

.PHONY: test tap test-cv test-cov-html unit lib-cov rm-lib-cov