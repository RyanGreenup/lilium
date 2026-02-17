# These are some docs



## Usage

### Global Variables


This is an example of global variables:

```bash
ping {{google_dns}}
```

These are set in ../book.toml like so:


```toml

[book]
title = "My Docs"
authors = ["Author Name"]
language = "en"

[preprocessor.variables.variables]
google_dns = "8.8.8.8"

```




### Mermaid

```mermaid
graph LR
    A[Start] --> B[End]
```
