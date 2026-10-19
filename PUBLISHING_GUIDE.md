# Publishing Bee2Bee to PyPI

## Prerequisites

1. Create accounts on [PyPI](https://pypi.org/account/register/) and [TestPyPI](https://test.pypi.org/account/register/).
2. Install the build tools:

```bash
pip install --upgrade pip build twine
```

## Build

```bash
rm -rf dist build *.egg-info
python -m build
```

Expected artifacts:

```text
dist/bee2bee-4.0.0.tar.gz
dist/bee2bee-4.0.0-py3-none-any.whl
```

Check the contents:

```bash
tar -tzf dist/bee2bee-4.0.0.tar.gz
```

## Test on TestPyPI

```bash
python -m twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ \
  --extra-index-url https://pypi.org/simple/ bee2bee
```

## Publish

```bash
python -m twine upload dist/*
```

Use a PyPI API token (starts with `pypi-`) as the password, with `__token__` as the username:

```ini
# ~/.pypirc
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-your-api-token

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-your-testpypi-token
```

## Versioning

Bee2Bee follows semantic versioning. Update both places:

- `pyproject.toml` → `version`
- `bee2bee/__init__.py` → `__version__`

Then rebuild:

```bash
rm -rf dist build *.egg-info
python -m build
python -m twine upload dist/*
```

## Verify

```bash
pip install bee2bee
python -c "import bee2bee; print(bee2bee.__version__)"
bee2bee --help
```

## Troubleshooting

- **File already exists**: PyPI versions are immutable; bump the version.
- **Missing files**: inspect the sdist with `tar -tzf`.
- **Import errors**: install the wheel in a clean virtual environment.
- **Authentication errors**: confirm the token scope and `__token__` username.

Tag the release:

```bash
git tag v4.0.0
git push origin v4.0.0
```

## Security

Never commit API tokens. Use 2FA on PyPI and TestPyPI.
