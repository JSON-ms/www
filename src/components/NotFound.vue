<template>
  <v-sheet class="fill-height">
    <v-empty-state
      icon="mdi-code-braces-box"
      color="primary"
      text="Sorry, the page you are looking for does not exist."
      title="404 - Page Not Found"
    >
      <v-btn theme="dark" to="/">
        <v-icon icon="mdi-home" start />
        Go to home page
      </v-btn>
    </v-empty-state>
  </v-sheet>
</template>
