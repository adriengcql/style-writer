# Stylesheet Writer

Write properties by selector to css, scss or less files.

Given a selector, a property name and a value, the property will be overwritten or added.


## Quick start

```
npm install stylesheet-writer
```
```js
import * as sw from 'stylesheet-writer'

const style = sw.open('__YOUR_PATH_TO_FILE__')
style.writeProperty('.container', 'color', 'blue') // writeProperty(__SELECTOR__, __PROPERTY_NAME__, __VALUE__)
```

```css
.container {
    color: red;
}
/* --> */
.container {
    color: blue;
}
```


## Methods

### `open(path: string, options?)`

Load the file for the given absolute path (must be `css`, `scss` or `less`).

options: `{ autosave: boolean, autorefresh: boolean }`

### `.writeProperty(selector: string, property: string, value: string)`

Write a property to the opened file.

### `.save()`

Save the opened file.

### `.refresh()`

Reload the opened file.



## Options

### `autosave`

default: `true`

If set to `true`, the file will be written every time you use `writeProperty()`, but for better performances you may want to decide when saving the file.

```js
const style = open('__YOUR_PATH_TO_FILE__', { autosave: false })
// do some work
style.save()
```
[!WARNING]
The file does not stay open, it's just loaded, so if `autorefresh` is set to `false`, any changes made outside will be overwritten when saving.

### `autorefresh`

default: `true`
(disabled if `autosave` is set to `false`)

If set to `true`, each time you use `writeProperty()` the file is read to load most recent change and avoid overwritting, but for better performances you may want to disable that.

```js
const style = open('__YOUR_PATH_TO_FILE__', { autorefresh: false })
// modify file outside
style.refresh()
// do some work
// style.save()
```

[!WARNING]
If `autosave` is set to `false` and `refresh()` is used without saving before, any change made with `writeProperty()` will be lost.