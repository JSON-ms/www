<script setup lang="ts">
import {useGlobalStore} from '@/stores/global';
import {computed, defineExpose, nextTick, onMounted, onUnmounted, ref, watch} from 'vue';
import type {IStructure, IStructureData} from '@/interfaces';
import {useLayout} from '@/composables/layout';
import StructureEditor from '@/components/StructureEditor.vue';
import {useIframe} from '@/composables/iframe';
import router from '@/router';
import {useUserData} from '@/composables/user-data';
import {useModelStore} from '@/stores/model';

const structure = defineModel<IStructure>({ required: true });
const emit = defineEmits(['save', 'create', 'change'])
const props = defineProps<{
  structureData: IStructureData,
  userData: any,
}>();

const structureEditor = ref<InstanceType<typeof StructureEditor> | null>();
const modelStore = useModelStore();
const globalStore = useGlobalStore();
const demoPreviewUrl = ref(import.meta.env.VITE_DEMO_PREVIEW_URL);
const loaded = ref(false);
const loading = ref(false);
const killIframe = ref(false);
const siteNotCompatibleSnack = ref(false);
const { layoutSize, windowHeight, layoutPx } = useLayout();
const { reloading, siteCompatible, sendMessageToIframe, getPathsFromSectionKey, listenIframeMessage, sendUserDataToIframe } = useIframe();
const { userDataLoading } = useUserData();
const iframeErrorMsg = ref('This site is not JSONms compatible');

const editorHeight = computed((): number => {
  const padding = (globalStore.userSettings.data.layoutSitePreviewPadding ? 96 : 63);
  const result = windowHeight.value - padding;
  if (globalStore.admin.editorExpanded) {
    return result + 32;
  }
  return result - layoutSize.value.preview.height;
})

const refresh = () => {
  if (siteCompatible.value) {
    reloading.value = true;
    sendMessageToIframe('reload');
  } else {
    reloading.value = true;
    killIframe.value = true;
    nextTick(() => killIframe.value = false);
    onIframeLoad();
  }
}

const onSaveStructureContent = (model: IStructure) => {
  emit('save', model);
}
const onCreateStructure = (model: IStructure) => {
  emit('create', model);
}
const onStructureContentChange = (content: string) => {
  emit('change', content);
}

let loadingIframeTimeout: any;
let checkIframeStructure: any;
const onIframeLoad = () => {
  let intervalCount = 0;
  loading.value = true;
  siteCompatible.value = false;
  siteNotCompatibleSnack.value = false;
  clearTimeout(loadingIframeTimeout);
  loadingIframeTimeout = setTimeout(() => {
    loading.value = false;
  }, 1000)
  clearInterval(checkIframeStructure);
  checkIframeStructure = setInterval(() => {
    if (siteCompatible.value) {
      clearInterval(checkIframeStructure);
      reloading.value = false;
    } else if (intervalCount >= 5000) {
      clearInterval(checkIframeStructure);
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
const sitePreviewUrl = ref(props.structureData.global.preview);
watch(() => globalStore.admin.previewMode, () => {
  if (globalStore.admin.previewMode !== null) {
    sitePreviewUrl.value = props.structureData.global.preview;
    if (!loaded.value) {
      onIframeLoad();
    }
    loaded.value = true;
  }
});
watch(() => props.structureData.global.preview, () => {
  if (globalStore.admin.previewMode !== null) {
    loaded.value = true;
    loading.value = true;
    clearTimeout(sitePreviewUrlTimeout);
    sitePreviewUrlTimeout = setTimeout(() => {
      sitePreviewUrl.value = props.structureData.global.preview;
      onIframeLoad();
    }, 300)
  }
}, { immediate: !!props.structureData.global.preview })

watch(() => modelStore.userData, () => {
  if (siteCompatible.value && globalStore.admin.previewMode !== null) {
    sendUserDataToIframe();
  }
}, { deep: true })

router.afterEach((to, from) => {
  if (to.params.section !== from.params.section) {
    const sectionKey = to.params.section;
    if (typeof sectionKey === 'string') {
      const paths = getPathsFromSectionKey(sectionKey);
      sendMessageToIframe('section', JSON.stringify({
        name: sectionKey,
        paths: paths,
      }));
    }
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
  structureEditor,
});
</script>

<template>
  <v-navigation-drawer
    v-model="layoutSize.preview.active"
    :width="layoutSize.preview.width"
    :location="globalStore.userSettings.data.layoutSitePreviewLocation"
    scrim
    class="site-preview-drawer"
    color="transparent"
    border="0"
    permanent
    floating
  >
    <div
      :class="[{
        'iframe-container fill-height w-100 d-flex align-center justify-center': true,
        'pa-4': globalStore.userSettings.data.layoutSitePreviewPadding
      }, globalStore.admin.previewMode, globalStore.admin.structure ? 'has-structure' : undefined]"
    >
      <v-card
        class="w-100 fill-height"
        color="sheet"
        :flat="!globalStore.userSettings.data.layoutSitePreviewPadding"
        :tile="!globalStore.userSettings.data.layoutSitePreviewPadding"
        :style="{
          height: globalStore.userSettings.data.layoutSitePreviewKeepRatio ? (layoutSize.preview.height + 'px !important') : undefined,
          width: layoutSize.preview.width + 'px !important',
        }"
      >
        <v-empty-state
          v-if="!structureData.global.preview"
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
            v-if="structureData.global.preview && !killIframe && loaded"
            id="iframe"
            :src="sitePreviewUrl"
            title="Preview"
            :style="{
              border: 0,
              float: 'left',
              opacity: reloading || loading ? 0.01 : 1,
              zoom: structureData.global.preview === demoPreviewUrl ? layoutPx(1) : layoutSize.preview.zoom,
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
        <div v-show="globalStore.admin.previewMode === 'desktop' && globalStore.admin.structure">
          <v-card
            :height="editorHeight"
            tile
            flat
            class="editor-card"
            theme="dark"
          >
            <StructureEditor
              ref="structureEditor"
              v-model="structure"
              :structure-data="structureData"
              :user-data="userData"
              class="fill-height"
              columns
              show-tabs
              @save="onSaveStructureContent"
              @create="onCreateStructure"
              @change="onStructureContentChange"
            >
              <template #header.end>
                <v-btn
                  size="small"
                  @click="globalStore.admin.editorExpanded = !globalStore.admin.editorExpanded"
                >
                  <span v-if="globalStore.admin.editorExpanded">Collapse</span>
                  <span v-else>Expand</span>
                  <v-icon v-if="globalStore.admin.editorExpanded" icon="mdi-unfold-less-horizontal" end />
                  <v-icon v-else icon="mdi-unfold-more-horizontal" end />
                </v-btn>
              </template>
            </StructureEditor>
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
.editor-card {
  transition: height 300ms ease;
}
.site-preview-drawer :deep(.v-navigation-drawer__content) {
  overflow: hidden !important;
}
</style>
