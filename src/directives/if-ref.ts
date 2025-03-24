const placeholder = document.createComment('v-if-ref');
const checkCondition = (el, binding) => {
  if (el.parentNode && !binding.value) {
    el.parentNode.insertBefore(placeholder, el);
    el.remove();
  } else if (!el.parentNode && binding.value) {
    placeholder.parentNode.insertBefore(el, placeholder);
    placeholder.remove();
  }
};

const vIfRef = {
  mounted(el, binding) {
    checkCondition(el, binding);
    const handleResize = () => checkCondition(el, binding);
    window.addEventListener('resize', handleResize);
    el._cleanup = () => window.removeEventListener('resize', handleResize);
  },
  updated(el, binding) {
    console.log(binding);
    checkCondition(el, binding);
  },
  beforeUnmount(el) {
    if (el._cleanup) {
      el._cleanup();
    }
  }
};

export default vIfRef;
