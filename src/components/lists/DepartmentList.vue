<template>
  <div class="data-list">
    <div class="datatable-wrapper">
      <table class="datatable">
        <thead class="datatable-head">
          <tr>
            <th scope="col" class="name">
              {{ $t('departments.fields.name') }}
            </th>
            <th scope="col">{{ $t('departments.fields.color') }}</th>
            <th scope="col" class="actions"></th>
          </tr>
        </thead>
        <tbody class="datatable-body" v-if="entries.length > 0">
          <tr class="datatable-row" v-for="entry in entries" :key="entry.id">
            <td class="name">
              {{ entry.name }}
            </td>
            <td class="color">
              <div>
                <span :style="{ background: entry.color }"> </span>
              </div>
            </td>
            <row-actions-cell
              @edit-clicked="$emit('edit-clicked', entry)"
              @delete-clicked="$emit('delete-clicked', entry)"
            />
          </tr>
        </tbody>
      </table>
    </div>
    <table-info :is-loading="isLoading" :is-error="isError"> </table-info>
    <p class="has-text-centered nb-asset-types">
      {{ entries.length }} {{ $tc('departments.number', entries.length) }}
    </p>
  </div>
</template>
<script>
import RowActionsCell from '@/components/cells/RowActionsCell.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'

export default {
  name: 'department-list',

  props: ['entries', 'isLoading', 'isError'],

  components: {
    RowActionsCell,
    TableInfo
  },

  emits: ['delete-clicked', 'edit-clicked']
}
</script>

<style lang="scss" scoped>
.color {
  width: 20px;
  height: 20px;
  text-align: center;
}

.color span {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 10px;
}

.datatable-body tr:first-child th,
.datatable-body tr:first-child td {
  border-top: 0;
}

.name {
  width: 300px;
  padding: 1em;
}
</style>
