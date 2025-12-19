import type { Directive, DirectiveBinding } from 'vue';

type CleanupEl = HTMLElement & {
  _cleanup?: () => void;
};

const placeholder = document.createComment('v-if-ref');
const checkCondition = (el: CleanupEl, binding: DirectiveBinding<boolean>): void => {
  if (el.parentNode && !binding.value) {
    el.parentNode.insertBefore(placeholder, el);
    el.remove();
  } else if (!el.parentNode && binding.value) {
    placeholder.parentNode?.insertBefore(el, placeholder);
    placeholder.remove();
  }
};

const vIfRef: Directive<CleanupEl, boolean> = {
  mounted(el: CleanupEl, binding: DirectiveBinding<boolean>) {
    checkCondition(el, binding);
    const handleResize = () => checkCondition(el, binding);
    window.addEventListener('resize', handleResize);
    el._cleanup = () => window.removeEventListener('resize', handleResize);
  },
  updated(el: CleanupEl, binding: DirectiveBinding<boolean>) {
    console.log(binding);
    checkCondition(el, binding);
  },
  beforeUnmount(el: CleanupEl) {
    el._cleanup?.();
  }
};

export default vIfRef;
