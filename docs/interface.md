# Interface

---

Let's get started on building your ideal admin interface with JSON.ms!

## Global Configuration
Let's start with the global configuration. You can copy paste and adjust the following code in your _YAML_ interface:
```yaml
global:
  
  # Set the title of your admin panel, which will be displayed prominently in the toolbar.
  title: Title of your admin panel
    
  # (Optional) Specify a URL for a logo image that will be displayed alongside the title, enhancing the visual identity of your panel.
  logo: https://json.ms/favicon.ico

  # (Optional) Specify a URL of a JSON.ms compatible website that you can preview while you work on your data.
  preview: https://demo.json.ms
```
These settings allows to create an admin panel that aligns with your brand and user experience goals.

## Locales

JSON.ms allows you to manage locales for translating the fields that will be saved in your application. You can easily define multiple locales in a customizable list of key/value pairs within the YAML interface. If no locales are provided, JSON.ms will default to "`en-US`." This feature enables you to ensure that the data fields are accurately translated, accommodating users who speak different languages and enhancing the overall usability of your application.

```yaml
locales:
  
  # key: value
  en-US: English (US)
  es-MX: Spanish (Mexico)
```

## Sections
The following YAML example defines a simplified section for an admin panel, specifically for managing content related to the home page. Here’s a breakdown of its components:

```yaml
sections:
  home: # Customizable key
    label: Home page
    fields:
      title: # Customizable key
        type: i18n
        label: Title
      body: # Customizable key
        type: i18n:markdown
        label: Body
```

#### Explanation:

- `sections`: This is the top-level key that groups all the different sections of your admin panel.
- `home`: This **customizable key** represents a specific section for your app. It will be used as the identifier in the payload when saving the field data in the admin panel.
- `label`: The value associated with this key is the label that will be displayed in the sidebar of the admin panel.
- `fields`: This key contains all the fields that will be displayed and editable by the user within this section.

### Fields

A field must be defined within the `fields` property using a unique key and must include at least a type and a label.

For instance:

```yaml
      title: 
        type: i18n
        label: Title
```

#### Supported Types
- `string`: A single-line text input.
- `markdown`: A fully-featured Markdown editor that allows for easy formatting of text using simple syntax.
- `number`: A numeric input field for entering numbers.
- `rating`: A component that allows users to provide feedback or evaluate an item using a star or point system, typically ranging from 1 to 5, visually represented through icons or bars.
- `slider`: A slider component that allows you to select a number. 
- `select`: A dropdown menu that allows users to choose one or multiple items from a predefined list.
- `checkbox`: A binary input that allows users to select one or more items from a set of choices.
- `radio`: A set of options where only one can be selected at a time, typically displayed as buttons.
- `date`: A date picker input for selecting a specific date.
- `switch`: A toggle switch that allows users to turn a setting on or off.
- `array`: A collection of items that can hold multiple fields.
- `node`: A fieldset (aka group) that contains a list of fields. Useful to categorize information both visually and structurally.
- `file`: An option to upload a file.
- `i18n`: A translatable single-line text input.
- `i18n:[TYPE]`: You can use any of the above types except `node` to make them translatable. For example, you can specify `i18n:string`, `i18n:markdown`, or even `i18n:file` to indicate that these fields should support multiple languages.

#### All Field Properties:
- `type`: Specifies a supported field type as defined earlier.
- `label`: The title that will be displayed within the field.
- `multiple`: A boolean value that indicates whether the field can accept multiple values (e.g., for `select`, `checkbox` or `file` types).
- `accept`: For `file` field only. It takes as its value a comma-separated list of one or more file types. You can add file extensions `*.jpg,*.gif` or even mime types `application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- `prepend`: An optional string that will be displayed before the input field.
- `append`: An optional string that will be displayed after the input field.
- `prepend-inner`: An optional string that will be displayed inside and before the input field. Can be used with `string`, `number`, `select`, `textarea` and `date` fields.'
- `append-inner`: An optional string that will be displayed inside and after the input field. Can be used with `string`, `number`, `select`, `textarea` and `date` fields.'
- `hint`: An optional string that provides additional information or guidance to the user about the field, displayed below the field.
- `icon`: (Optional) An icon that will be displayed next to the menu item.
  - Make sure to prefix all icons with "mdi-". For instance: mdi-check will show the "check" icon.
  - Documentation: https://pictogrammers.com/library/mdi/
- `required`: (Optional) It ensures that the user must provide a value, preventing the form from being submitted until the field is completed.
- `fields`: This is applicable only for `array` and `node` types. You can use any supported type here, and you can nest sub-arrays as needed to create complex data structures and hierarchies.
- `items`: This is applicable only for `select`, `checkbox` and `radio` types. You can list all available values or even use an enum.
- `min`: An optional minimum number. Works with `number` and `slider` fields.
- `max`: An optional maximum number. Works with `number` and `slider` fields.
- `length`: An optional length amount of stars in `rating` field.
- `step`: An optional incremental amount when using `number` and `slider` fields.
- `half-increments`: (Optional) Allows half-increments of stars when using the `rating` field.

### Paths

If you want to synchronize your sections with your website or app pages, you need to define paths. By default, if you do not set this parameter, JSON.ms will still try to find a route name matching the section key (in this case, "about").

```yaml
section:
  about:
    label: About page
    path: /about-us
```

Here's a simple way to map a path to a section. Obviously routes are not always as simple so there are different approaches you can take. Paths support arrays, variables, wildcards and regexes.

Here's a more advanced approach:

```yaml
section:
  about:
    label: About page
    path:
      - /{{locale}}/about-us
      - about___{{locale}}
      - about___*
      - about___.{2} 
```

The {{locale}} variable will be replaced with the current locale of the website. In this scenario, all paths will be analysed. The first one has been defined as a full path, the second as a path name (in this case, the way Nuxt handles route names), the third one includes a wildcard and the last one is a regex.

### Conditional fields

You can show or hide fields based on a set of conditions. Let's adjust the same example as above and try to show the body field if the title has a specific value.

```yaml
section:
  about:
    label: About page
    fields:
      title:
        type: string
        label: Title
      body:
        type: markdown
        label: Body
        conditional: about.title == "potato"
```

If you look closely at the body field, there's a new conditional attribute. This can be a string or an array if you need multiple conditions. In this scenario, `body` will only appear if the value of `title` is `potato`.

The format for the conditional attribute is the following: `path`, `operator`, `expected value`, seperated by an empty space, just like if you were writing Javascript. If your expected value is a string that contains spaces, wrap your expected value in double-quotes.

**Available operators**: `==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`

Now let's look at a more advanced example using an array.

```yaml
section:
  about:
    label: About page
    fields:
      items:
        type: array
        label: Items
        fields:
          title:
            type: string
            label: Title
          body:
            type: markdown
            label: Body
            conditional: this.title == "potato"
```

So this is a similar structure, however the `about` section now contains a field named `items` which is an array that contains a `title` and a `body`. Now what if we want the condition to be based on the value of an item that is within of the same index of the array we're in? That's where `this` becomes handy! Now we're telling the conditional field to check for a field named `title` at the same level of `body`.

## Enums

Reusable enumerations (enums) are a powerful feature that allows you to define a set of predefined values that can be referenced multiple times throughout your document or schema. This promotes consistency in your data definitions and reduces redundancy, making your code cleaner and easier to maintain.

```yaml
enums:
  countries:
    ca: Canada
    us: United-States
    mx: Mexico
```

You can later use these enums seperated by commas (ex: enums.countries) as `items` value for supported types: `select`, `checkbox` and `radio`.

Here's an example of a field using an enum:

```yaml
      country: 
        type: select
        label: Title
        items: enums.countries
```
