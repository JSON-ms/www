# YAML Interface
---
Let's get started on building your ideal admin panel with JSON.ms!

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

> Explanation:
>
> - `sections`: This is the top-level key that groups all the different sections of your admin panel.
> - `home`: This **customizable key** represents a specific section for your app. It will be used as the identifier in the payload when saving the field data in the admin panel.
> - `label`: The value associated with this key is the label that will be displayed in the sidebar of the admin panel.
> - `fields`: This key contains all the fields that will be displayed and editable by the user within this section.

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
- `range`: A range slider component that allows you to select a range of number. 
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

#### Generic Properties:

> These properties are applicable to all fields.

- `type`: Specifies a supported field type as defined earlier.
- `label`: The title that will be displayed within the field.
- `icon`: (Optional) An icon that will be displayed next to the menu item.
  - Make sure to prefix all icons with "mdi-". For instance: mdi-check will show the "check" icon.
  - Documentation: https://pictogrammers.com/library/mdi/
- `default`: A optional default value for the current field.
- `prepend`: An optional string that will be displayed before the input field.
- `append`: An optional string that will be displayed after the input field.
- `prepend-inner`: An optional string that will be displayed inside and before the input field. Can be used with `string`, `number`, `select`, `textarea` and `date` fields.'
- `append-inner`: An optional string that will be displayed inside and after the input field. Can be used with `string`, `number`, `select`, `textarea` and `date` fields.'
- `rules`: An optional list of rules (regex) to be applied to the field. See rules section for explanation.
- `hint`: An optional string that provides additional information or guidance to the user about the field, displayed below the field.
- `required`: (Optional) It ensures that the user must provide a value, preventing the form from being submitted until the field is completed.

#### Field-Specific Properties:

> ### Select
> - `multiple`: A boolean value that indicates whether the field can accept multiple values.
> - `items`: You can list all available values or even use an enum (key/value).
>
> #### Example:
>
> ```yaml
>       type: 
>         type: select
>         label: Types
>         multiple: true
>         # items: enums.countries
>         items:
>           a: Type A
>           b: Type B
> ```

> ### Checkbox
> - `multiple`: A boolean value that indicates whether the field can accept multiple values.
> - `items`: You can list all available values or even use an enum (key/value).
>
> #### Example:
>
> ```yaml
>       type: 
>         type: checkbox
>         label: Types
>         multiple: true
>         # items: enums.countries
>         items:
>           a: Type A
>           b: Type B
> ```

> ### Radio
> - `items`: You can list all available values or even use an enum (key/value).
>
> #### Example:
>
> ```yaml
>       type: 
>         type: radio
>         label: Types
>         # items: enums.countries
>         items:
>           a: Type A
>           b: Type B
> ```

> ### Array
> - `fields`: You can use any supported type here, and you can nest sub-arrays as needed to create complex data structures and hierarchies.
> - `min`: An optional minimum number.
> - `max`: An optional maximum number.
> - `collapsable`: (Optional, true by default) Makes array items collapsable/expandable.
>
> #### Example:
>
> ```yaml
>       items: 
>         type: array
>         label: List of items
>         min: 1 # User needs to set at least one item
>         max: 5 # User can't add more than 5 items
>         collapsable: true
>         fields:
>           title:
>             type: string
>             label: Title
>           body:
>             type: textarea
>             label: Body
> ```

> ### Node
> - `fields`: You can use any supported type here, and you can nest sub-arrays as needed to create complex data structures and hierarchies.
> - `collapsable`: (Optional, false by default) Makes inner fields collapsable/expandable.
> - `collapsed`: (Optional, false by default) Makes inner fields collapsed by default.
> 
> #### Example:
> 
> ```yaml
>       cta: 
>         type: node
>         label: Call-to-action
>         collapsable: true
>         collapsed: true # Will be collapsed by default
>         fields:
>           label:
>             type: string
>             label: Label of the button
>           url:
>             type: string
>             label: URL
> ```

> ### File
> - `accept`: For `file` field only. It takes as its value a comma-separated list of one or more file types. You can add file extensions `*.jpg,*.gif` or even mime types `application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
> - `multiple`: A boolean value that indicates whether the field can accept multiple values.
>
> #### Example:
>
> ```yaml
>       gallery: 
>         type: file
>         label: Gallery of images
>         multiple: true # Will allow multiple files to be assigned to this field
>         accept: image/* # Will only accept images (works with file extensions as well)
> ```

> ### Color
> - `swatches`: (Optional, false by default) Shows a palette of colors.
> - `canvas`: (Optional, true by default) Shows a canvas to select a color.
> - `sliders`: (Optional, true by default) Shows a slider to select a color.
> - `inputs`: (Optional, true by default) Shows an input field to customize your color.
>
> #### Example:
>
> ```yaml
>       backgroundColor: 
>         type: color
>         label: Background color of the page
>         swatches: true # Optional, false by default
> ```

> ### Rating
> - `length`: An optional length amount of stars.
> - `half-increments`: (Optional, false by default) Allows half-increments of stars.
>
> #### Example:
>
> ```yaml
>       rating: 
>         type: rating
>         label: On a scale of 1 to 10, how are you satisfied?
>         length: 10
>         half-increments: true
> ```

> ### Number
> - `step`: An optional incremental amount.
> - `min`: An optional minimum number.
> - `max`: An optional maximum number.
>
> #### Example:
>
> ```yaml
>       amount: 
>         type: number
>         label: How many drink(s) do you want?
>         min: 1 # At least 1
>         max: 10 # No more than 10
>         step: 2 # Because you always buy one for your partner as well
> ```

> ### Slider
> - `step`: An optional incremental amount.
> - `min`: (1 by default) An optional minimum number.
> - `max`: (100 by default) An optional maximum number.
>
> #### Example:
>
> ```yaml
>       amount: 
>         type: slider
>         label: On a scale of 1 to 10, how are you satisfied?
>         min: 1 # At least 1
>         max: 10 # No more than 10
>         default: 5 # Default value to 5
> ```

> ### Range
> - `step`: An optional incremental amount.
> - `min`: (1 by default) An optional minimum number.
> - `max`: (100 by default) An optional maximum number.
>
> #### Example:
>
> ```yaml
>       amount: 
>         type: range
>         label: Choose a range between 1 and 100
>         default: [25, 75] # Default the range to 25 <> 75
> ```

### Rules

You can create validation for your form using regex expressions. Here's an example of two rules for a field `title`. It will validate that the value of the title starts with `abc` and ends with `123`.

```yaml
      title:
        type: string
        label: Title
        rules:
          - regex: /^abc/
            message: The string must start with abc
          - regex: /123$/
            message: The string must end with 123
```

Fields `number` automatically includes a rule for checking number values.

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

The `{{locale}}` variable will be replaced with the current locale of the website. In this scenario, all paths will be analysed. The first one has been defined as a full path, the second as a path name (in this case, the way Nuxt handles route names), the third one includes a wildcard and the last one is a regex.

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

## Schemas

Reusable schemas (fieldset) are a powerful feature that allows you to define a set of predefined fields that can be referenced multiple times throughout your interface. This promotes consistency in your data definitions and reduces redundancy, making your code cleaner and easier to maintain.

```yaml
schemas:
  meta:
    title:
      type: string
      label: Title
      required: true
    description:
      type: string
      label: Description
```

You can later use these schemas as a field type like any other widget using the `schemas.[NAME]` syntax. 

Here's an example of a field using an schema:

```yaml
      metadata: 
        type: schemas.meta
        label: Metadata # (Optional) A title for your collapsable group
        collapsable: true # Make it a collapsable group
        collapsed: true # Make it collapsed by default
```
