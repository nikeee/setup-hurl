# setup-hurl

A GitHub Action to set up [Hurl](https://github.com/Orange-OpenSource/hurl).

## Getting Started
```yaml
    - uses: nikeee/setup-hurl@v1
    - run: hurl --version
```

By default, the [latest GitHub Release of Hurl](https://github.com/Orange-OpenSource/hurl/releases) will be used. If you need a specific version, you can pass a semver specifier:
```yaml
    - uses: nikeee/setup-hurl@v1
      with:
        hurl-version: ~1.3.0
    - run: hurl --version
```
