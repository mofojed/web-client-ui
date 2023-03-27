import { ChartModel, ChartModelFactory } from '@deephaven/chart';
import dh, {
  Table,
  VariableTypeUnion,
  IdeConnection,
  VariableDefinition,
} from '@deephaven/jsapi-shim';
import {
  IrisGridModel,
  IrisGridModelFactory,
  IrisGridUtils,
} from '@deephaven/iris-grid';
import { getTimeZone, store } from '@deephaven/redux';
import {
  ChartPanelMetadata,
  GLChartPanelState,
  IrisGridPanelMetadata,
  isChartPanelTableMetadata,
} from '@deephaven/dashboard-core-plugins';

export const createChartModel = async (
  connection: IdeConnection,
  metadata: ChartPanelMetadata,
  panelState?: GLChartPanelState
): Promise<ChartModel> => {
  let settings;
  let tableName;
  let figureName;
  let tableSettings;

  if (isChartPanelTableMetadata(metadata)) {
    settings = metadata.settings;
    tableName = metadata.table;
    figureName = undefined;
    tableSettings = metadata.tableSettings;
  } else {
    settings = {};
    tableName = '';
    figureName = metadata.figure;
    tableSettings = {};
  }
  if (panelState !== undefined) {
    if (panelState.tableSettings != null) {
      tableSettings = panelState.tableSettings;
    }
    if (panelState.table != null) {
      tableName = panelState.table;
    }
    if (panelState.figure != null) {
      figureName = panelState.figure;
    }
    if (panelState.settings != null) {
      settings = {
        ...settings,
        ...panelState.settings,
      };
    }
  }

  if (figureName !== undefined) {
    const definition = {
      title: figureName,
      name: figureName,
      type: dh.VariableType.FIGURE,
    };
    const figure = await connection.getObject(definition);

    return ChartModelFactory.makeModel(settings, figure);
  }

  const definition = {
    title: figureName,
    name: tableName,
    type: dh.VariableType.TABLE,
  };
  const table = await connection.getObject(definition);

  IrisGridUtils.applyTableSettings(
    table,
    tableSettings,
    getTimeZone(store.getState())
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ChartModelFactory.makeModelFromSettings(settings as any, table);
};

export function getGridPanelMetadata(
  metadata?: IrisGridPanelMetadata,
  widget?: VariableDefinition
): IrisGridPanelMetadata {
  if (metadata != null) {
    return metadata;
  }
  if (widget == null) {
    throw new Error(
      'Need either metadata or widget specified to get GridPanel metadata'
    );
  }
  const { name, type } = widget;
  if (name == null) {
    throw new Error('No name specified in widget definition');
  }
  return { table: name, type };
}

export const createGridModel = async (
  connection: IdeConnection,
  metadata: IrisGridPanelMetadata
): Promise<IrisGridModel> => {
  const { table: tableName } = metadata;
  const definition = {
    title: tableName,
    name: tableName,
    type: metadata.type as VariableTypeUnion,
  };
  const table = (await connection.getObject(definition)) as Table;
  return IrisGridModelFactory.makeModel(table);
};

export default { createChartModel, createGridModel };
