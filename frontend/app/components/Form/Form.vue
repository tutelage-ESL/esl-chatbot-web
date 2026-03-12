<script setup lang="ts">

const props = defineProps<{
  class?: string;
  schema?: any;
  formData?: Record<string, any>;
}>();

const emit = defineEmits<{
  submit: [];
}>();

const errors = ref<Record<string, any>>({});

const formatErorrs = (result: any) => {
  const formattedErrors: any = {};

  result.error.issues.forEach((err: any) => {
    const path = err.path;
    
    // Handle simple field errors (path length 1)
    if (path.length === 1) {
      formattedErrors[path[0]] = err.message;
      return;
    }

    let current = formattedErrors;

    // Navigate through the path and create the nested structure
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const isLast = i === path.length - 1;

      if (isLast) {
        // Last element in path - assign the error message
        if (!current[key]) {
          current[key] = err.message;
        }
      } else {
        // Not last element - need to create nested structure
        const nextKey = path[i + 1];
        
        // Check if next key is a number (array index)
        if (typeof nextKey === 'number') {
          // Create array if it doesn't exist
          if (!current[key]) {
            current[key] = [];
          }
          // If current[key] is a string (simple error), convert to array
          if (typeof current[key] === 'string') {
            const existingError = current[key];
            current[key] = { _error: existingError };
          }
          // Create object at index if it doesn't exist
          if (!current[key][nextKey]) {
            current[key][nextKey] = {};
          }
          current = current[key][nextKey];
          i++; // Skip the next iteration since we handled the index
        } else {
          // Create object if it doesn't exist
          if (!current[key]) {
            current[key] = {};
          }
          // If current[key] is a string, convert to object
          if (typeof current[key] === 'string') {
            const existingError = current[key];
            current[key] = { _error: existingError };
          }
          current = current[key];
        }
      }
    }
  });

  errors.value = formattedErrors;
}
const handleSubmit = () => {
  // console.log(props.formData);
  
  if (props.schema) {
    const result = props.schema.safeParse(props.formData);
    // console.log("Validation result: ", result);
    
    if (!result.success) {      
      formatErorrs(result);     
      return;
    }
    errors.value = {};
  }
  if (Object.keys(errors.value).length > 0) {
    return;
  }
  emit("submit");
};
</script>

<template>
  <form @submit.prevent="handleSubmit" :class="[$props.class]">
    <slot :errors="errors" />
  </form>
</template>
