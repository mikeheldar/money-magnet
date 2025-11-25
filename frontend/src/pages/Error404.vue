<template>
  <div class="flex flex-center" style="min-height: 100vh; width: 100%;">
    <div class="text-center">
      <p class="text-faded">
        Sorry, nothing here...<strong>(404)</strong>
      </p>
      <q-btn
        color="primary"
        style="width:200px;"
        to="/"
        label="Go back"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Error404'
})
</script>

