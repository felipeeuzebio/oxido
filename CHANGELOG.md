# Changelog

## [0.7.0](https://github.com/felipeeuzebio/oxido/compare/v0.6.0...v0.7.0) (2026-10-09)


### Features

* **ui:** add a Ctrl+K command palette, a skip link and moved focus ([#28](https://github.com/felipeeuzebio/oxido/issues/28)) ([d8b7335](https://github.com/felipeeuzebio/oxido/commit/d8b73359452f869d80fe9ef262ab22fe193d356c))

## [0.6.0](https://github.com/felipeeuzebio/oxido/compare/v0.5.0...v0.6.0) (2026-10-07)


### Features

* **roadmap:** build the home screen from the compiled course ([#26](https://github.com/felipeeuzebio/oxido/issues/26)) ([003cb84](https://github.com/felipeeuzebio/oxido/commit/003cb84a0e02f0db5f9015faed1980c3c0295f07))

## [0.5.0](https://github.com/felipeeuzebio/oxido/compare/v0.4.0...v0.5.0) (2026-10-07)


### Features

* **ui:** add the rail, and a tab bar on phones ([#24](https://github.com/felipeeuzebio/oxido/issues/24)) ([59b8c0a](https://github.com/felipeeuzebio/oxido/commit/59b8c0a25368d7225e18409f95af08badfedf8d7))

## [0.4.0](https://github.com/felipeeuzebio/oxido/compare/v0.3.0...v0.4.0) (2026-10-07)


### Features

* **ui:** self-host the three fonts ([#22](https://github.com/felipeeuzebio/oxido/issues/22)) ([7259cbc](https://github.com/felipeeuzebio/oxido/commit/7259cbcebd79238655d8eda1904f54ee55e9f372))

## [0.3.0](https://github.com/felipeeuzebio/oxido/compare/v0.2.0...v0.3.0) (2026-10-07)


### Features

* **ui:** add the shadcn/ui components and move the buttons onto Button ([#20](https://github.com/felipeeuzebio/oxido/issues/20)) ([6130da4](https://github.com/felipeeuzebio/oxido/commit/6130da4b5b235bd498842d5906af1a9b637e7551))

## [0.2.0](https://github.com/felipeeuzebio/oxido/compare/v0.1.0...v0.2.0) (2026-10-07)


### Features

* **agents:** draft lessons as a tournament with blind judges ([#9](https://github.com/felipeeuzebio/oxido/issues/9)) ([e3923b3](https://github.com/felipeeuzebio/oxido/commit/e3923b3e819570ab4d5977f73d4ffd453f1774e5))
* **content:** add lesson 1 on getting started ([#10](https://github.com/felipeeuzebio/oxido/issues/10)) ([393f2b0](https://github.com/felipeeuzebio/oxido/commit/393f2b00a202a79d8e3098ffd58bf579df01a275))
* **lesson:** open outside links in a new tab and style inline code ([#12](https://github.com/felipeeuzebio/oxido/issues/12)) ([e28d7d1](https://github.com/felipeeuzebio/oxido/commit/e28d7d17fcce4be1b6c04540422673d05d7eae6f))
* **ui:** show every error on one page that reads like rustc ([#11](https://github.com/felipeeuzebio/oxido/issues/11)) ([abf5403](https://github.com/felipeeuzebio/oxido/commit/abf5403f547612bd561b7c1ef48383771b6846a3))


### Bug Fixes

* serve newly compiled lessons without restarting the dev server ([#13](https://github.com/felipeeuzebio/oxido/issues/13)) ([54f8aff](https://github.com/felipeeuzebio/oxido/commit/54f8aff8fcd9d7b43a846baf7cc75101715db3a6))

## 0.1.0 (2026-10-01)


### Features

* **compiler:** compile the course and pre-render its lessons ([#1](https://github.com/felipeeuzebio/oxido/issues/1)) ([0c4b231](https://github.com/felipeeuzebio/oxido/commit/0c4b231acee43bfaf2335283c6e0c1902fb9323b))
* **content:** add the minisql course outline ([914a357](https://github.com/felipeeuzebio/oxido/commit/914a357ac86fd90ddda9df7d152e941f5301ebe3))
* **core:** parse clippy's JSON output into editor diagnostics ([a4ebf43](https://github.com/felipeeuzebio/oxido/commit/a4ebf43e120fb716b1b7e753fb6b2d374653003a))
* **quiz:** grade quizzes and show results with the correct answers ([b564469](https://github.com/felipeeuzebio/oxido/commit/b56446930b6bc0e025d4f7eb7b6ad06ea8ab567a))
* **server:** a second oxido run reopens the browser ([53f32a2](https://github.com/felipeeuzebio/oxido/commit/53f32a25c191955fa2d49c7f218453578f180fa0))
* **server:** add `oxido doctor` ([f2b45b6](https://github.com/felipeeuzebio/oxido/commit/f2b45b6c471d0a98ce81d0625232f77ce31ece05))
* **server:** add oxido, the local server with SQLite storage ([3ce6b43](https://github.com/felipeeuzebio/oxido/commit/3ce6b434afeda92a939ee80781c52e8eeedd9d2f))
* **server:** run only inside a course project ([0b0cbbd](https://github.com/felipeeuzebio/oxido/commit/0b0cbbd11ef520b7ab98ad48d0ad96709603aefc))
* **ui:** add the React app with the Dojo and Forge themes ([2aca5de](https://github.com/felipeeuzebio/oxido/commit/2aca5de7652c93b6c032e023ef7492913384d032))
* **ui:** mark the rail's current page in rust instead of a notch ([1e1d680](https://github.com/felipeeuzebio/oxido/commit/1e1d6806d651fbdac0aadc46f5dad33ea0340d46))


### Bug Fixes

* **server:** stop cleanly on SIGTERM as well as Ctrl+C ([30ea3fa](https://github.com/felipeeuzebio/oxido/commit/30ea3fa15ca534937e5570bb98df9caf5a39a83e))
