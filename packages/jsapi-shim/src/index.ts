/* eslint-disable import/first */
import { dh as dhType } from '@deephaven/jsapi-types';
import shim from './dh';

import AggregationOperation = dhType.AggregationOperation;
import BigDecimalWrapper = dhType.BigDecimalWrapper;
import BigIntegerWrapper = dhType.BigIntegerWrapper;
import Client = dhType.Client;
import Column = dhType.Column;
import ColumnGroup = dhType.ColumnGroup;
import CommandInfo = dhType.CommandInfo;
import CoreClient = dhType.CoreClient;
import CustomColumn = dhType.CustomColumn;
import DateWrapper = dhType.DateWrapper;
import FilterCondition = dhType.FilterCondition;
import FilterValue = dhType.FilterValue;
import Ide = dhType.Ide;
import IdeConnection = dhType.IdeConnection;
import IdeConnectionOptions = dhType.IdeConnectionOptions;
import IdeSession = dhType.IdeSession;
import InputTable = dhType.InputTable;
import LongWrapper = dhType.LongWrapper;
import PartitionedTable = dhType.PartitionedTable;
import QueryInfo = dhType.QueryInfo;
import RangeSet = dhType.RangeSet;
import RollupConfig = dhType.RollupConfig;
import Sort = dhType.Sort;
import SubscriptionTableData = dhType.SubscriptionTableData;
import Table = dhType.Table;
import TableData = dhType.TableData;
import TableMap = dhType.TableMap;
import TableSubscription = dhType.TableSubscription;
import TotalsTableConfig = dhType.TotalsTableConfig;
import TreeTable = dhType.TreeTable;
import TreeRow = dhType.TreeRow;
import TreeTableConfig = dhType.TreeTableConfig;
import ValueType = dhType.ValueType;
import VariableType = dhType.VariableType;
import VariableTypeUnion = dhType.VariableTypeType; // Name discrepancy

import ColumnStatistics = dhType.ColumnStatistics;
import Format = dhType.Format;
import LayoutHints = dhType.LayoutHints;
import Row = dhType.Row;
import TableViewportSubscription = dhType.TableViewportSubscription;
import TotalsTable = dhType.TotalsTable;
import ViewportData = dhType.ViewportData;
import ValueTypeUnion = dhType.ValueTypeType; // Name discrepancy

type RemoverFn = () => void; // Remove in cleanup
type EventListener = (e: CustomEvent) => void; // Remove in cleanup
import LoginOptions = dhType.LoginOptions;

export type {
  ColumnStatistics,
  Format,
  LayoutHints,
  Row,
  TableViewportSubscription,
  TotalsTable,
  ViewportData,
  AggregationOperation,
  BigDecimalWrapper,
  BigIntegerWrapper,
  Client,
  Column,
  ColumnGroup,
  CommandInfo,
  CoreClient,
  CustomColumn,
  DateWrapper,
  FilterCondition,
  FilterValue,
  Ide,
  IdeConnection,
  IdeConnectionOptions,
  IdeSession,
  InputTable,
  LongWrapper,
  PartitionedTable,
  QueryInfo,
  RangeSet,
  RollupConfig,
  Sort,
  SubscriptionTableData,
  Table,
  TableData,
  TableMap,
  TableSubscription,
  TotalsTableConfig,
  TreeTable,
  TreeRow,
  TreeTableConfig,
  ValueType,
  VariableType,
  VariableTypeUnion,
  ValueTypeUnion,
  RemoverFn,
  EventListener,
  LoginOptions,
};

import i18n = dhType.i18n;
import TimeZone = i18n.TimeZone;
import DateTimeFormat = i18n.DateTimeFormat;
import NumberFormat = i18n.NumberFormat;

export type { TimeZone, DateTimeFormat, NumberFormat };

import ide = dhType.ide;
import CommandResult = ide.CommandResult;
import LogItem = ide.LogItem;
import VariableChanges = ide.VariableChanges;
import VariableDefinition = ide.VariableDefinition;

export type { CommandResult, LogItem, VariableChanges, VariableDefinition };

import plot = dhType.plot;
import Axis = plot.Axis;
import AxisDescriptor = plot.AxisDescriptor;
import AxisFormatType = plot.AxisFormatType;
import AxisPosition = plot.AxisPosition;
import AxisType = plot.AxisType;
import Chart = plot.Chart;
import ChartData = plot.ChartData;
import ChartDescriptor = plot.ChartDescriptor;
import ChartType = plot.ChartType;
import DownsampleOptions = plot.DownsampleOptions;
import Figure = plot.Figure;
import FigureDescriptor = plot.FigureDescriptor;
import FigureFetchError = plot.FigureFetchError;
import FigureSourceException = plot.FigureSourceException;
import Series = plot.Series;
import SeriesDataSource = plot.SeriesDataSource;
import SeriesDataSourceException = plot.SeriesDataSourceException;
import SeriesDescriptor = plot.SeriesDescriptor;
import SeriesPlotStyle = plot.SeriesPlotStyle;
import SourceDescriptor = plot.SourceDescriptor;
import SourceType = plot.SourceType;
import OneClick = plot.OneClick;

export type {
  Axis,
  AxisDescriptor,
  AxisFormatType,
  AxisPosition,
  AxisType,
  Chart,
  ChartData,
  ChartDescriptor,
  ChartType,
  DownsampleOptions,
  Figure,
  FigureDescriptor,
  FigureFetchError,
  FigureSourceException,
  Series,
  SeriesDataSource,
  SeriesDataSourceException,
  SeriesDescriptor,
  SeriesPlotStyle,
  SourceDescriptor,
  SourceType,
  OneClick,
};

import calendar = dhType.calendar;
import BusinessCalendar = calendar.BusinessCalendar;
import BusinessPeriod = calendar.BusinessPeriod;
import Holiday = calendar.Holiday;

export type { BusinessCalendar, BusinessPeriod, Holiday };

import storage = dhType.storage;
import FileContents = storage.FileContents;
import ItemDetails = storage.ItemDetails;
import StorageService = storage.StorageService;

export type { FileContents, ItemDetails, StorageService };

export default shim;
export { default as dh } from './dh';
export { default as PropTypes } from './PropTypes';
