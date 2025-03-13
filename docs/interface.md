# Interface

---

Let's get started on building your ideal admin interface with JSON.ms!

## Global Configuration
Let's start with the global configuration. You can copy paste and adjust the following code in your _YAML_ interface:
```yaml
global:
  
  # Set the title of your admin panel, which will be displayed prominently in the toolbar.
  title: Title of your admin panel
  
  # Add copyright text that will appear at the bottom of the sidebar, providing legal information or branding.
  copyright: Brand © 2025 - All rights reserved
    
  # Specify a URL for a logo image that will be displayed alongside the title, enhancing the visual identity of your panel.
  logo: https://json.ms/favicon.ico
  
  # Customize the color scheme of your admin panel by defining primary and secondary colors, allowing for a personalized look and feel.
  theme:
    default: dark
    dark:
      primary: "#1867c0"
    light:
      primary: "#1867c0"
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

## Sections
The following YAML example defines a simplified section for an admin panel, specifically for managing content related to the home page. Here’s a breakdown of its components:

```yaml
sections:
  home:
    label: Home page
    fields:
      title: 
        type: i18n
        label: Title
      body:
        type: i18n:wysiwyg
        label: Body
```

### Explanation:

- `sections`: This is the top-level key that groups all the different sections of your admin panel.
- `home`: This **customizable key** represents a specific section for your app. It will be used as the identifier in the payload when saving the field data in the admin panel.
- `label`: The value associated with this key is the label that will be displayed in the sidebar of the admin panel.
- `fields`: This key contains all the fields that will be displayed and editable by the user within this section.

**Note**: You can create a separator by adding a `separator` key either above or below any other section, as shown below:

```yaml
  home:
    label: Home page
  separator:
  contact:
    label: Contact Us
```

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
- `wysiwyg`: A fully-featured WYSIWYG (What You See Is What You Get) editor for rich text formatting.
- `number`: A numeric input field for entering numbers.
- `select`: A dropdown menu that allows users to choose one or multiple items from a predefined list.
- `checkbox`: A binary input that allows users to select one or more items from a set of choices.
- `radio`: A set of options where only one can be selected at a time, typically displayed as buttons.
- `date`: A date picker input for selecting a specific date.
- `switch`: A toggle switch that allows users to turn a setting on or off.
- `array`: A collection of items that can hold multiple fields.
- `file`: An option to upload a file.
- `i18n`
- `i18n:[TYPE]`: You can use any of the above types to make them translatable. For example, you can specify `i18n:string`, `i18n:wysiwyg`, or even `i18n:file` to indicate that these fields should support multiple languages.

#### Field Values:
- `type`: Specifies a supported field type as defined earlier.
- `label`: The title that will be displayed within the field.
- `multiple`: A boolean value that indicates whether the field can accept multiple values (e.g., for `select` or `checkbox` types).
- `prepend`: An optional string that will be displayed before the input field.
- `append`: An optional string that will be displayed after the input field.
- `prepend-inner`: An optional string that will be displayed inside and before the input field. Can be used with `string`, `number`, `select`, `textarea` and `date` fields.'
- `append-inner`: An optional string that will be displayed inside and after the input field. Can be used with `string`, `number`, `select`, `textarea` and `date` fields.'
- `hint`: An optional string that provides additional information or guidance to the user about the field, displayed below the field.
- `icon`: (Optional) An icon that will be displayed next to the menu item.
  - Make sure to prefix all icons with "mdi-". For instance: mdi-check will show the "check" icon.
  - Documentation: https://pictogrammers.com/library/mdi/
- `required`: (Optional) It ensures that the user must provide a value, preventing the form from being submitted until the field is completed.
- `fields`: This is applicable only for `array` types. You can use any supported type here, and you can nest sub-arrays as needed to create complex data structures and hierarchies.
- `items`: This is applicable only for `select`, `checkbox` and `radio` types. You can list all available values or even use an enum.
