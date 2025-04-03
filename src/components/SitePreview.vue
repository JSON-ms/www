<script setup lang="ts">
import {useGlobalStore} from '@/stores/global';
import {computed, defineExpose, nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import type {IInterface, IInterfaceData} from '@/interfaces';
import {useLayout} from '@/composables/layout';
import InterfaceEditor from '@/components/InterfaceEditor.vue';
import {useIframe} from '@/composables/iframe';
import router from '@/router';
import {useUserData} from '@/composables/user-data';
import {useModelStore} from '@/stores/model';

const interfaceModel = defineModel<IInterface>({ required: true });
const emit = defineEmits(['save', 'create', 'change'])
const props = defineProps<{
  interfaceData: IInterfaceData,
}>();

const interfaceEditor = ref<InstanceType<typeof InterfaceEditor> | null>();
const modelStore = useModelStore();
const globalStore = useGlobalStore();
const demoPreviewUrl = ref(import.meta.env.VITE_DEMO_PREVIEW_URL);
const loaded = ref(false);
const loading = ref(false);
const killIframe = ref(false);
const siteNotCompatibleSnack = ref(false);
const { layoutSize, windowHeight, layoutPx } = useLayout();
const { reloading, siteCompatible, sendMessageToIframe, listenIframeMessage, sendUserDataToIframe } = useIframe();
const { userDataLoading } = useUserData();
const iframeErrorMsg = ref('This site is not JSONms compatible');

const refresh = () => {
  if (siteCompatible.value) {
    reloading.value = true;
    sendMessageToIframe('reload');
  } else {
    killIframe.value = true;
    nextTick(() => killIframe.value = false);
    onIframeLoad();
  }
}

const onSaveInterfaceContent = (model: IInterface) => {
  emit('save', model);
}
const onCreateInterface = (model: IInterface) => {
  emit('create', model);
}
const onInterfaceContentChange = (content: string) => {
  emit('change', content);
}

let loadingIframeTimeout: any;
let checkIframeInterface: any;
const onIframeLoad = () => {
  let intervalCount = 0;
  loading.value = true;
  siteCompatible.value = false;
  siteNotCompatibleSnack.value = false;
  clearTimeout(loadingIframeTimeout);
  loadingIframeTimeout = setTimeout(() => {
    loading.value = false;
  }, 1000)
  clearInterval(checkIframeInterface);
  checkIframeInterface = setInterval(() => {
    if (siteCompatible.value) {
      clearInterval(checkIframeInterface);
      reloading.value = false;
    } else if (intervalCount >= 5000) {
      clearInterval(checkIframeInterface);
      siteNotCompatibleSnack.value = true;
      reloading.value = false;
      setTimeout(() => {
        siteNotCompatibleSnack.value = false;
      }, 3000)
    }

    // // Do not increment if we're loading user data
    if (!userDataLoading.value) {
      intervalCount += 100;
    }
  }, 100)
}

let sitePreviewUrlTimeout: any;
const sitePreviewUrl = ref(props.interfaceData.global.preview);
watch(() => globalStore.admin.previewMode, () => {
  if (globalStore.admin.previewMode !== null) {
    sitePreviewUrl.value = props.interfaceData.global.preview;
    if (!loaded.value) {
      onIframeLoad();
    }
    loaded.value = true;
  }
});
watch(() => props.interfaceData.global.preview, () => {
  if (globalStore.admin.previewMode !== null) {
    loaded.value = true;
    loading.value = true;
    clearTimeout(sitePreviewUrlTimeout);
    sitePreviewUrlTimeout = setTimeout(() => {
      sitePreviewUrl.value = props.interfaceData.global.preview;
      onIframeLoad();
    }, 300)
  }
}, { immediate: !!props.interfaceData.global.preview })

watch(() => modelStore.userData, () => {
  if (siteCompatible.value && globalStore.admin.previewMode !== null) {
    sendUserDataToIframe();
  }
}, { deep: true })

router.afterEach((to, from) => {
  if (to.params.section.toString() !== from.params.section.toString()) {
    sendMessageToIframe('section', to.params.section.toString());
  }
})
onMounted(() => {
  window.addEventListener('message', listenIframeMessage)
});
onUnmounted(() => {
  window.removeEventListener('message', listenIframeMessage)
});

defineExpose({
  refresh,
  interfaceEditor,
});
</script>

<template>
  <v-navigation-drawer
    v-model="layoutSize.preview.active"
    :width="layoutSize.preview.width"
    scrim
    color="transparent"
    border="0"
    permanent
    floating
  >
    <div
      :class="[{
        'iframe-container fill-height w-100 pa-4 d-flex align-center justify-center': true,
      }, globalStore.admin.previewMode, globalStore.admin.interface ? 'has-interface' : undefined]"
    >
      <v-card
        class="w-100 fill-height"
        :style="{
          backgroundColor: 'white',
          height: layoutSize.preview.height + 'px !important',
          width: layoutSize.preview.width + 'px !important',
        }"
      >
        <v-empty-state
          v-if="!interfaceData.global.preview"
          icon="mdi-eye-off-outline"
          title="No preview URL found"
          text="No preview attribute has been defined in the global section of your YAML template. To view the preview website, please ensure that the preview attribute is defined."
        />
        <template v-else>
          <v-overlay
            :model-value="loading || reloading"
            :transition="false"
            class="align-center justify-center"
            contained
            absolute
            persistent
          >
            <v-progress-circular color="primary" :size="globalStore.admin.previewMode === 'mobile' ? 96 : 128" indeterminate />
          </v-overlay>
          <iframe
            v-if="interfaceData.global.preview && !killIframe && loaded"
            id="iframe"
            :src="sitePreviewUrl"
            title="Preview"
            :style="{
              border: 0,
              float: 'left',
              opacity: reloading || loading ? 0.01 : 1,
              zoom: interfaceData.global.preview === demoPreviewUrl ? layoutPx(1) : layoutSize.preview.zoom,
            }"
            class="w-100 fill-height"
            @error="() => iframeErrorMsg = 'Unable to load website.'"
          />
          <div class="position-absolute w-100" style="left: 0; bottom: 0">
            <v-expand-transition>
              <div v-if="siteNotCompatibleSnack">
                <v-alert
                  :text="iframeErrorMsg"
                  type="warning"
                  tile
                />
              </div>
            </v-expand-transition>
          </div>
        </template>
      </v-card>
    </div>
    <template #append>
      <v-expand-transition>
        <div v-show="globalStore.admin.previewMode === 'desktop' && globalStore.admin.interface">
          <v-card :height="windowHeight - layoutSize.preview.height - 96" class="pa-2 pl-0" tile flat theme="dark">
            <InterfaceEditor
              ref="interfaceEditor"
              v-model="interfaceModel"
              style="flex: 1"
              @save="onSaveInterfaceContent"
              @create="onCreateInterface"
              @change="onInterfaceContentChange"
            />
          </v-card>
        </div>
      </v-expand-transition>
    </template>
  </v-navigation-drawer>
</template>

<style lang="scss" scoped>
.iframe-container {
  & .v-card,
  & iframe {
    transition: all 200ms ease;
  }
}
</style>
