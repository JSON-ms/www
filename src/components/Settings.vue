<script setup lang="ts">
import type { IInterface } from '@/interfaces';

const selectedInterface = defineModel<IInterface>({ required: true });
const {
  demo = false,
  disabled = false,
} = defineProps<{
  demo?: boolean,
  disabled?: boolean,
}>();

</script>

<template>
  <div class="d-flex flex-column" style="gap: 0.66rem">

    <v-alert
      v-if="demo || disabled"
      border="start"
      type="warning"
      variant="elevated"
    >
      <span v-if="demo">You are currently in demo mode. Please log in to your account to make any changes.</span>
      <span v-else-if="disabled">Only the owner of this interface is allowed to modify the settings.</span>
    </v-alert>

    <v-card>
      <v-card-title>Server</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">
        <v-text-field
          v-model="selectedInterface.server_url"
          :disabled="demo || disabled"
          prepend-inner-icon="mdi-webhook"
          label="Webhook Endpoint"
          hide-details="auto"
          hint="This feature allows you to specify a URL that will be triggered whenever data is read from or saved to the admin panel. By integrating a webhook, you can synchronize data with a remote server and perform various transformations."
          persistent-hint
          autocomplete="null"
          class="mb-3"
          clearable
        />
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>Permissions</v-card-title>
      <v-card-text class="d-flex flex-column" style="gap: 1rem">
        <v-alert variant="tonal" icon="mdi-information-slab-box-outline">
          No emails will be sent to users. Please ensure that the Google account email addresses entered match the accounts that users are connected with when accessing the application.
        </v-alert>
        <v-combobox
          v-model="selectedInterface.permission_interface"
          :disabled="!!demo || disabled"
          :items="[]"
          prepend-inner-icon="mdi-account-multiple-check"
          label="Interface User(s)"
          hide-details="auto"
          hint="This field contains a list of Google email accounts who have permission to edit the YAML interface used to generate the admin panel, ensuring that only authorized individuals can make changes to the interface."
          persistent-hint
          clearable
          chips
          closable-chips
          multiple
        />
        <v-combobox
          v-model="selectedInterface.permission_admin"
          :disabled="!!demo || disabled"
          :items="[]"
          prepend-inner-icon="mdi-account-multiple-check"
          label="Admin User(s)"
          hide-details="auto"
          hint="This field contains a list of Google email accounts who have permission to access the admin panel and modify its data, ensuring that only authorized individuals can make changes to the data."
          persistent-hint
          clearable
          chips
          closable-chips
          multiple
        />
      </v-card-text>
    </v-card>
  </div>
</template>
