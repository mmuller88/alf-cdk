.DEFAULT_GOAL := build

FUNCTION_NAME := $(shell node -p "require('./package.json').name")

check-env:
ifeq ($(FUNCTION_NAME),)
	$(error FUNCTION_NAME is empty)
endif
ifeq ($(FUNCTION_NAME),undefined)
	$(error FUNCTION_NAME is undefined)
endif

.PHONY: prepare
prepare:
	echo "not implemented"

.PHONY: install
install:
	npm install && npm install

.PHONY: clean
clean:
	rm -rf ./cdk.out ./cdk/cdk.out ./build ./package ./cdk/build

.PHONY: build
build: clean install
	npm run build

.PHONY: builddev
builddev: clean install
	npm run build

.PHONY: buildprod
buildprod: clean install
	npm run build

.PHONY: test
test:
	echo "not implemented"

.PHONY: package
package:
	cd build && npm install --only=production

.PHONY: cdkclean
cdkclean:
	rm -rf ./cdk.out && rm -rf ./cdk.out ./build

.PHONY: cdkbuild
cdkbuild: cdkclean install
	npm run build

.PHONY: cdkdiff
cdkdiff: cdkclean cdkbuild
	cdk diff || true

.PHONY: cdkdiffdev
cdkdiffdev: cdkclean cdkbuild builddev
	cdk diff '$(FUNCTION_NAME)-dev' --profile damadden88 || true

.PHONY: cdkdiffprod
cdkdiffprod: cdkclean cdkbuild buildprod
	cdk diff '$(FUNCTION_NAME)-prod' --profile damadden88 || true

.PHONY: cdkdeploydev
cdkdeploydev: cdkclean cdkbuild builddev
	cdk diff '$(FUNCTION_NAME)-dev' --profile damadden88 || true
	cdk deploy '$(FUNCTION_NAME)-dev' --profile damadden88 --require-approval never

.PHONY: cdkdestroydev
cdkdestroydev: cdkclean cdkbuild
	yes | cdk destroy '$(FUNCTION_NAME)-dev' --profile damadden88

.PHONY: cdkdeployprod
cdkdeployprod: cdkclean cdkbuild buildprod
	cdk diff '$(FUNCTION_NAME)-prod' --profile damadden88 || true
	cdk deploy '$(FUNCTION_NAME)-prod' --profile damadden88 --require-approval never

.PHONY: cdkdestroyprod
cdkdestroyprod: cdkclean cdkbuild
	yes | cdk destroy '$(FUNCTION_NAME)-prod' --profile damadden88

.PHONY: cdksynthprod
cdksynthprod: cdkclean cdkbuild buildprod
	cdk synth '$(FUNCTION_NAME)-prod' --profile damadden88

.PHONY: cdkpipelinediff
cdkpipelinediff: check-env cdkclean cdkbuild
	cdk diff "$(FUNCTION_NAME)-pipeline-stack-build" --profile damadden88 || true

.PHONY: cdkpipelinedeploy
cdkpipelinedeploy: check-env cdkclean cdkbuild
	cdk deploy "$(FUNCTION_NAME)-pipeline-stack-build" --profile damadden88 --require-approval never