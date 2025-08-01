<template>
  <div class="data-list">
    <div class="datatable-wrapper">
      <table class="datatable">
        <thead class="datatable-head">
          <tr>
            <th scope="col" class="name">
              {{ $t('status_automations.fields.entity_type') }}
            </th>
            <th scope="col" class="in-task-type">
              {{ $t('status_automations.fields.in_task_type') }}
            </th>
            <th scope="col" class="in-task-status">
              {{ $t('status_automations.fields.in_task_status') }}
            </th>
            <th scope="col" class="automation-type">
              {{ $t('status_automations.fields.out_field_type') }}
            </th>
            <th scope="col" class="out-task-type">
              {{ $t('status_automations.fields.out_task_type') }}
            </th>
            <th scope="col" class="out-task-status">
              {{ $t('status_automations.fields.out_task_status') }}
            </th>
            <th scope="col" class="import-last-revision">
              {{ $t('status_automations.fields.import_last_revision') }}
            </th>
            <th scope="col" class="actions">&nbsp;</th>
          </tr>
        </thead>
        <tbody class="datatable-body">
          <tr
            class="datatable-row"
            :key="statusAutomation.id"
            v-for="statusAutomation in entries"
          >
            <td scope="row" class="name">
              <div class="flexrow">
                <span
                  class="flexrow-item"
                  :title="$t('status_automations.wrong_automation')"
                  v-if="isStatusAutomationDisabled(statusAutomation)"
                >
                  <alert-triangle-icon />
                </span>
                <span class="flexrow-item">
                  {{ statusAutomation.entity_type }}
                </span>
              </div>
            </td>
            <task-type-cell
              class="in-task-type"
              :task-type="getTaskType(statusAutomation.in_task_type_id)"
            />
            <task-status-cell
              class="in-task-status"
              :entry="taskStatusMap.get(statusAutomation.in_task_status_id)"
            />
            <td class="input-separator">
              {{
                statusAutomation.out_field_type === 'ready_for'
                  ? $t('status_automations.change_ready_for')
                  : $t('status_automations.change_status')
              }}
            </td>
            <task-type-cell
              class="out-task-type"
              :task-type="getTaskType(statusAutomation.out_task_type_id)"
            />
            <task-status-cell
              class="out-task-status"
              v-if="statusAutomation.out_field_type === 'status'"
              :entry="taskStatusMap.get(statusAutomation.out_task_status_id)"
            />
            <td class="name out-task-status" v-else></td>
            <td class="import-last-revision">
              {{ formatBoolean(statusAutomation.import_last_revision) }}
            </td>
            <row-actions-cell
              @edit-clicked="$emit('edit-clicked', statusAutomation)"
              @delete-clicked="$emit('delete-clicked', statusAutomation)"
              v-if="isEditable"
            />
            <td v-else>
              <button
                class="button"
                @click="removeStatusAutomation(statusAutomation.id)"
              >
                {{ $t('main.remove') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <table-info :is-loading="isLoading" :is-error="isError" />

    <p class="has-text-centered nb-status-automations">
      {{ entries.length }}
      {{ $tc('status_automations.number', entries.length) }}
    </p>
  </div>
</template>

<script>
import { AlertTriangleIcon } from 'lucide-vue-next'
import { mapGetters, mapActions } from 'vuex'

import { formatListMixin } from '@/components/mixins/format'

import RowActionsCell from '@/components/cells/RowActionsCell.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'
import TaskStatusCell from '@/components/cells/TaskStatusCell.vue'
import TaskTypeCell from '@/components/cells/TaskTypeCell.vue'

export default {
  name: 'status-automation-list',

  mixins: [formatListMixin],

  components: {
    AlertTriangleIcon,
    RowActionsCell,
    TableInfo,
    TaskStatusCell,
    TaskTypeCell
  },

  props: {
    entries: {
      type: Array,
      default: () => []
    },
    isEditable: {
      type: Boolean,
      default: false
    },
    isError: {
      type: Boolean,
      default: false
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['delete-clicked', 'edit-clicked'],

  computed: {
    ...mapGetters([
      'taskStatusMap',
      'getTaskType',
      'isStatusAutomationDisabled',
      'remainingStatusAutomations'
    ])
  },
  methods: {
    ...mapActions(['removeStatusAutomationFromProduction']),

    async removeStatusAutomation(statusAutomationId) {
      await this.removeStatusAutomationFromProduction(statusAutomationId)
      await this.$nextTick()
      // Reselect the remainingStatusAutomations to avoid empty statusAutomationId
      if (this.remainingStatusAutomations.length > 0) {
        this.statusAutomationId = this.remainingStatusAutomations[0].id
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.datatable-body tr:first-child th,
.datatable-body tr:first-child td {
  border-top: 0;
}

.name {
  width: 120px;
  min-width: 120px;
}

td.name {
  text-transform: capitalize;
}

.in-task-type {
  width: 150px;
  min-width: 150px;
}

.in-task-status {
  width: 150px;
  min-width: 150px;
}

.separator {
  width: 150px;
  min-width: 150px;
}

.out-task-type {
  width: 150px;
  min-width: 150px;
}

.out-task-status {
  width: 150px;
  min-width: 150px;
}

.thead {
  width: 100%;
}

.nb-status-automations {
  color: var(--text);
}
</style>
