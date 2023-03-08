/* eslint-disable */
// Minimum TypeScript Version: 4.3

export interface IIterableResult<T> {
	value:T;
	done:boolean;
}
export interface Iterator<T> {
	hasNext():boolean;
	next():IIterableResult<T>;
}
export namespace dh.storage {

	/**
	* Represents a file's contents loaded from the server. If an etag was specified when loading, client should first test
	* if the etag of this instance matches - if so, the contents will be empty, and the client's existing contents should
	* be used.
	*/
	export class FileContents {
		protected constructor();

		static blob(blob:Blob):FileContents;
		static text(...text:string[]):FileContents;
		static arrayBuffers(...buffers:ArrayBuffer[]):FileContents;
		text():Promise<string>;
		arrayBuffer():Promise<ArrayBuffer>;
		get etag():string;
	}

	/**
	* Storage service metadata about files and folders.
	*/
	export class ItemDetails {
		protected constructor();

		get filename():string;
		get basename():string;
		get size():number;
		get etag():string;
		get type():'file' | 'directory';
		get dirname():string;
	}

	/**
	* Remote service to read and write files on the server. Paths use "/" as a separator, and should not start with "/".
	*/
	export class StorageService {
		protected constructor();

		/**
		* Lists items in a given directory, with an optional filter glob to only list files that match. The empty or "root"
		* path should be specified as the empty string.
		*
		* @param path the path of the directory to list
		* @param glob optional glob to filter the contents of the directory
		* @return a promise containing the any items that are present in the given directory that match the glob, or an
		*         error.
		*/
		listItems(path:string, glob?:string):Promise<Array<ItemDetails>>;
		/**
		* Downloads a file at the given path, unless an etag is provided that matches the file's current contents.
		*
		* @param path the path of the file to fetch
		* @param etag an optional etag from the last time the client saw this file
		* @return a promise containing details about the file's contents, or an error.
		*/
		loadFile(path:string, etag?:string):Promise<FileContents>;
		/**
		* Deletes the item at the given path. Directories must be empty to be deleted.
		*
		* @param path the path of the item to delete
		* @return a promise with no value on success, or an error.
		*/
		deleteItem(path:string):Promise<void>;
		/**
		* Saves the provided contents to the given path, creating a file or replacing an existing one. The optional newFile
		* parameter can be passed to indicate that an existing file must not be overwritten, only a new file created.
		*
		* Note that directories must be empty to be overwritten.
		*
		* @param path the path of the file to write
		* @param contents the contents to write to that path
		* @param allowOverwrite true to allow an existing file to be overwritten, false or skip to require a new file
		* @return a promise with a FileContents, holding only the new etag (if the server emitted one), or an error
		*/
		saveFile(path:string, contents:FileContents, allowOverwrite?:boolean):Promise<FileContents>;
		/**
		* Moves (and/or renames) an item from its old path to its new path. The optional newFile parameter can be passed to
		* enforce that an existing item must not be overwritten.
		*
		* Note that directories must be empty to be overwritten.
		*
		* @param oldPath the path of the existing item
		* @param newPath the new path to move the item to
		* @param allowOverwrite true to allow an existing file to be overwritten, false or skip to require a new file
		* @return a promise with no value on success, or an error.
		*/
		moveItem(oldPath:string, newPath:string, allowOverwrite?:boolean):Promise<void>;
		/**
		* Creates a new directory at the specified path.
		*
		* @param path the path of the directory to create
		* @return a promise with no value on success, or an error.
		*/
		createDirectory(path:string):Promise<void>;
	}

}

export namespace dh {

	/**
	* Event data, describing the indexes that were added/removed/updated, and providing access to Rows (and thus data
	* in columns) either by index, or scanning the complete present index.
	*/
	export interface SubscriptionTableData extends TableData {
		get fullIndex():RangeSet;
		get removed():RangeSet;
		get added():RangeSet;
		get columns():Array<Column>;
		get modified():RangeSet;
		get rows():Array<SubscriptionRow>;
	}
	export interface LayoutHints {
		get hiddenColumns():string[];
		get frozenColumns():string[];
		get columnGroups():ColumnGroup[];
		get areSavedLayoutsAllowed():boolean;
		get frontColumns():string[];
		get backColumns():string[];
		get searchDisplayMode():string;
	}

	export class SearchDisplayMode {
		static readonly SEARCH_DISPLAY_HIDE:string;
		static readonly SEARCH_DISPLAY_SHOW:string;
	}

	export interface ViewportData extends TableData {
		get offset():number;
		get columns():Array<Column>;
		get rows():Array<ViewportRow>;
	}
	/**
	* Wrap LocalDate values for use in JS. Provides text formatting for display and access to the underlying value.
	*/
	export interface LocalDateWrapper {
		valueOf():string;
		getYear():number;
		getMonthValue():number;
		getDayOfMonth():number;
		toString():string;
	}
	/**
	* Wrap LocalTime values for use in JS. Provides text formatting for display and access to the underlying value.
	*/
	export interface LocalTimeWrapper {
		valueOf():string;
		getHour():number;
		getMinute():number;
		getSecond():number;
		getNano():number;
		toString():string;
	}
	/**
	* Row implementation that also provides additional read-only properties.
	*/
	export interface TreeRow extends ViewportRow {
		get isExpanded():boolean;
		get depth():number;
		get hasChildren():boolean;
		get index():LongWrapper;
	}
	export interface Format {
		get formatString():string;
		get backgroundColor():string;
		get color():string;
		/**
		* @deprecated Prefer formatString.
		*/
		get numberFormat():string;
	}
	export interface ColumnGroup {
		color?:string;
		children:string[];
		name:string;
	}
	export interface SubscriptionRow extends Row {
		get index():LongWrapper;
	}
	export interface WorkerHeapInfo {
		/**
		* Total heap size available for this worker.
		*/
		get totalHeapSize():number;
		get freeMemory():number;
		get maximumHeapSize():number;
	}
	/**
	* Behaves like a Table, but doesn't expose all of its API for changing the internal state. Instead, state is driven by
	* the upstream table - when it changes handle, this listens and updates its own handle accordingly.
	*
	* Additionally, this is automatically subscribed to its one and only row, across all columns.
	*
	* A new config is returned any time it is accessed, to prevent accidental mutation, and to allow it to be used as a
	* template when fetching a new totals table, or changing the totals table in use.
	*/
	export interface TotalsTable {
		setViewport(firstRow:number, lastRow:number, columns?:Array<Column>, updateIntervalMs?:number):void;
		getViewportData():Promise<TableData>;
		findColumn(key:string):Column;
		findColumns(keys:string[]):Column[];
		close():void;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		applySort(sort:Sort[]):Array<Sort>;
		applyCustomColumns(customColumns:object[]):Array<CustomColumn>;
		applyFilter(filter:FilterCondition[]):Array<FilterCondition>;
		get filter():Array<FilterCondition>;
		get size():number;
		get columns():Array<Column>;
		get totalsTableConfig():TotalsTableConfig;
		get sort():Array<Sort>;
		get customColumns():Array<CustomColumn>;
	}
	export interface TreeViewportData extends ViewportData {
		get offset():number;
		get columns():Array<Column>;
		get rows():Array<TreeRow>;
	}
	export interface WidgetExportedObject {
		fetch():Promise<object>;
		get type():string;
	}
	/**
	* Encapsulates event handling around table subscriptions by "cheating" and wrapping up a JsTable instance to do the
	* real dirty work. This allows a viewport to stay open on the old table if desired, while this one remains open.
	* <p>
	* As this just wraps a JsTable (and thus a CTS), it holds its own flattened, pUT'd handle to get deltas from the
	* server. The setViewport method can be used to adjust this table instead of creating a new one.
	* <p>
	* Existing methods on JsTable like setViewport and getViewportData are intended to proxy to this, which then will talk
	* to the underlying handle and accumulated data.
	* <p>
	* As long as we keep the existing methods/events on JsTable, close() is not required if no other method is called, with
	* the idea then that the caller did not actually use this type. This means that for every exported method (which then
	* will mark the instance of "actually being used, please don't automatically close me"), there must be an internal
	* version called by those existing JsTable method, which will allow this instance to be cleaned up once the JsTable
	* deems it no longer in use.
	* <p>
	* Note that if the caller does close an instance, this shuts down the JsTable's use of this (while the converse is not
	* true), providing a way to stop the server from streaming updates to the client.
	*/
	export interface TableViewportSubscription extends HasEventHandling {
		setViewport(firstRow:number, lastRow:number, columns?:Column[], updateIntervalMs?:number):void;
		close():void;
		getViewportData():Promise<TableData>;
		snapshot(rows:RangeSet, columns:Column[]):Promise<TableData>;
	}
	export interface HasEventHandling {
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
	}
	export interface Widget {
		getDataAsBase64():string;
		getDataAsU8():Uint8Array;
		get exportedObjects():WidgetExportedObject[];
		get type():string;
	}
	export interface RefreshToken {
		get bytes():string;
		get expiry():number;
	}
	export interface ViewportRow extends Row {
		get index():LongWrapper;
	}
	export interface TableData {
		get(index:object):Row;
		getData(index:object, column:Column):any;
		getFormat(index:object, column:Column):Format;
		get columns():Array<Column>;
		get rows():Array<Row>;
	}
	/**
	* Javascript wrapper for {@link ColumnStatistics}
	*/
	export interface ColumnStatistics {
		/**
		* Gets the type of formatting that should be used for given statistic.
		*
		* @param name the display name of the statistic
		* @return the format type, null to use column formatting
		*/
		getType(name:string):string;
		/**
		* Gets a map with the name of each unique value as key and the count a the value.
		*
		* @return the unique values map
		*/
		get uniqueValues():Map<string,number>;
		/**
		* Gets a map with the display name of statistics as keys and the numeric stat as a value.
		*
		* @return the statistics map
		*/
		get statisticsMap():Map<string,object>;
	}
	export interface Row {
		get(column:Column):any;
		getFormat(column:Column):Format;
		get index():LongWrapper;
	}

	export class PartitionedTable implements HasEventHandling {
		static readonly EVENT_KEYADDED:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_RECONNECTFAILED:string;

		protected constructor();

		getTable(key:object):Promise<Table>;
		getMergedTable():Promise<Table>;
		getKeys():Set<object>;
		close():void;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		get size():number;
	}

	/**
	* Wrap BigInteger values for use in JS. Provides text formatting for display and access to the underlying value.
	*/
	export class BigIntegerWrapper {
		protected constructor();

		static ofString(str:string):BigIntegerWrapper;
		asNumber():number;
		valueOf():string;
		toString():string;
	}

	/**
	* A js type for operating on input tables.
	*/
	export class InputTable {
		protected constructor();

		addRow(row:object, userTimeZone?:string):Promise<InputTable>;
		addRows(rows:object[], userTimeZone?:string):Promise<InputTable>;
		addTable(tableToAdd:Table):Promise<InputTable>;
		addTables(tablesToAdd:Table[]):Promise<InputTable>;
		deleteTable(tableToDelete:Table):Promise<InputTable>;
		deleteTables(tablesToDelete:Table[]):Promise<InputTable>;
		get keys():string[];
		get values():string[];
		get keyColumns():Column[];
		get valueColumns():Column[];
		get table():Table;
	}

	export class Sort {
		static readonly ASCENDING:string;
		static readonly DESCENDING:string;
		static readonly REVERSE:string;

		protected constructor();

		asc():Sort;
		desc():Sort;
		abs():Sort;
		toString():string;
		get isAbs():boolean;
		get column():Column;
		get direction():string;
	}

	export class LongWrapper {
		protected constructor();

		static ofString(str:string):LongWrapper;
		asNumber():number;
		valueOf():string;
		toString():string;
	}

	/**
	* Simple wrapper to emulate RangeSet/Index in JS, with the caveat that LongWrappers may make poor keys in plain JS.
	*/
	export class RangeSet {
		protected constructor();

		iterator():Iterator<LongWrapper>;
		get size():number;
		static ofRange(first:number, last:number):RangeSet;
		static ofItems(rows:number[]):RangeSet;
		static ofRanges(ranges:RangeSet[]):RangeSet;
		static ofSortedRanges(ranges:RangeSet[]):RangeSet;
	}

	export class TotalsTableConfig {
		/**
		* @deprecated
		*/
		static readonly COUNT:string;
		/**
		* @deprecated
		*/
		static readonly MIN:string;
		/**
		* @deprecated
		*/
		static readonly MAX:string;
		/**
		* @deprecated
		*/
		static readonly SUM:string;
		/**
		* @deprecated
		*/
		static readonly ABS_SUM:string;
		/**
		* @deprecated
		*/
		static readonly VAR:string;
		/**
		* @deprecated
		*/
		static readonly AVG:string;
		/**
		* @deprecated
		*/
		static readonly STD:string;
		/**
		* @deprecated
		*/
		static readonly FIRST:string;
		/**
		* @deprecated
		*/
		static readonly LAST:string;
		/**
		* @deprecated
		*/
		static readonly SKIP:string;
		showTotalsByDefault?:boolean;
		showGrandTotalsByDefault?:boolean;
		defaultOperation?:AggregationOperationType;
		operationMap:{ [key: string]: Array<AggregationOperationType>; };
		groupBy?:Array<String>;

		constructor();

		toString():string;
	}

	export class FilterCondition {
		protected constructor();

		not():FilterCondition;
		and(...filters:FilterCondition[]):FilterCondition;
		or(...filters:FilterCondition[]):FilterCondition;
		toString():string;
		get columns():Array<Column>;
		static invoke(func:string, ...args:FilterValue[]):FilterCondition;
		static search(value:FilterValue, columns?:FilterValue[]):FilterCondition;
	}

	export class TableMap {
		static readonly EVENT_KEYADDED:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_RECONNECTFAILED:string;
	}

	export class RollupConfig {
		groupingColumns:Array<String>;
		aggregations:{ [key: string]: Array<AggregationOperationType>; };
		includeConstituents:boolean;
		includeOriginalColumns?:boolean;
		includeDescriptions:boolean;

		constructor();
	}

	export class Ide {
		constructor();

		/**
		* @deprecated
		*/
		getExistingSession(websocketUrl:string, authToken:string, serviceId:string, language:string):Promise<IdeSession>;
		/**
		* @deprecated
		*/
		static getExistingSession(websocketUrl:string, authToken:string, serviceId:string, language:string):Promise<IdeSession>;
	}

	export class IdeConnection {
		static readonly HACK_CONNECTION_FAILURE:string;

		/**
		* @deprecated
		*/
		constructor(serverUrl:string, fromJava?:boolean);

		close():void;
		running():Promise<IdeConnection>;
		getObject(definitionObject:dh.ide.VariableDefinition):Promise<any>;
		subscribeToFieldUpdates(callback:(value:dh.ide.VariableChanges)=>void):()=>void;
		disconnected():void;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		onLogMessage(callback:(value:dh.ide.LogItem)=>void):()=>void;
		startSession(type:string):Promise<IdeSession>;
		getConsoleTypes():Promise<Array<string>>;
		getWorkerHeapInfo():Promise<WorkerHeapInfo>;
	}

	export class CustomColumn {
		static readonly TYPE_FORMAT_COLOR:string;
		static readonly TYPE_FORMAT_NUMBER:string;
		static readonly TYPE_FORMAT_DATE:string;
		static readonly TYPE_NEW:string;

		protected constructor();

		valueOf():string;
		toString():string;
		get expression():string;
		get name():string;
		get type():string;
	}

	/**
	* TODO provide hooks into the event handlers so we can see if no one is listening any more and release the table
	* handle/viewport.
	*/
	export class Table implements HasEventHandling {
		static readonly EVENT_SIZECHANGED:string;
		static readonly EVENT_UPDATED:string;
		static readonly EVENT_ROWADDED:string;
		static readonly EVENT_ROWREMOVED:string;
		static readonly EVENT_ROWUPDATED:string;
		static readonly EVENT_SORTCHANGED:string;
		static readonly EVENT_FILTERCHANGED:string;
		static readonly EVENT_CUSTOMCOLUMNSCHANGED:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_RECONNECTFAILED:string;
		static readonly EVENT_REQUEST_FAILED:string;
		static readonly EVENT_REQUEST_SUCCEEDED:string;
		static readonly SIZE_UNCOALESCED:number;

		protected constructor();

		batch(userCode:(value:unknown)=>void):Promise<Table>;
		findColumn(key:string):Column;
		findColumns(keys:string[]):Column[];
		isStreamTable():boolean;
		inputTable():Promise<InputTable>;
		close():void;
		getAttributes():string[];
		getAttribute(attributeName:string):object;
		applySort(sort:Sort[]):Array<Sort>;
		applyFilter(filter:FilterCondition[]):Array<FilterCondition>;
		applyCustomColumns(customColumns:(string|CustomColumn)[]):Array<CustomColumn>;
		setViewport(firstRow:number, lastRow:number, columns?:Array<Column>|null|undefined, updateIntervalMs?:number|null|undefined):TableViewportSubscription;
		getViewportData():Promise<TableData>;
		subscribe(columns:Array<Column>, updateIntervalMs?:number):TableSubscription;
		selectDistinct(columns:Column[]):Promise<Table>;
		getColumnStatistics(column:Column):Promise<ColumnStatistics>;
		copy(resolved?:boolean):Promise<Table>;
		rollup(configObject:RollupConfig):Promise<TreeTable>;
		treeTable(configObject:TreeTableConfig):Promise<TreeTable>;
		freeze():Promise<Table>;
		snapshot(baseTable:Table, doInitialSnapshot?:boolean, stampColumns?:string[]):Promise<Table>;
		/**
		* @deprecated
		*/
		join(joinType:object, rightTable:Table, columnsToMatch:Array<string>, columnsToAdd?:Array<string>, asOfMatchRule?:object):Promise<Table>;
		asOfJoin(rightTable:Table, columnsToMatch:Array<string>, columnsToAdd?:Array<string>, asOfMatchRule?:string):Promise<Table>;
		crossJoin(rightTable:Table, columnsToMatch:Array<string>, columnsToAdd?:Array<string>, reserve_bits?:number):Promise<Table>;
		exactJoin(rightTable:Table, columnsToMatch:Array<string>, columnsToAdd?:Array<string>):Promise<Table>;
		naturalJoin(rightTable:Table, columnsToMatch:Array<string>, columnsToAdd?:Array<string>):Promise<Table>;
		byExternal(keys:object, dropKeys?:boolean):Promise<PartitionedTable>;
		partitionBy(keys:object, dropKeys?:boolean):Promise<PartitionedTable>;
		/**
		* Seek the row matching the data provided
		* 
		* @param startingRow Row to start the seek from
		* @param column Column to seek for value on
		* @param valueType Type of value provided
		* @param seekValue Value to seek
		* @param insensitive Optional value to flag a search as case-insensitive. Defaults to `false`.
		* @param contains Optional value to have the seek value do a contains search instead of exact equality. Defaults to
		*        `false`.
		* @param isBackwards Optional value to seek backwards through the table instead of forwards. Defaults to `false`.
		* @return A promise that resolves to the row value found.
		*/
		seekRow(startingRow:number, column:Column, valueType:ValueTypeType, seekValue:unknown, insensitive?:boolean|null|undefined, contains?:boolean|null|undefined, isBackwards?:boolean|null|undefined):Promise<number>;
		getTotalsTable(config?:TotalsTableConfig):TotalsTable;
		toString():string;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		get hasInputTable():boolean;
		get columns():Array<Column>;
		get description():string|null|undefined;
		get sort():Array<Sort>;
		get customColumns():Array<CustomColumn>;
		get filter():Array<FilterCondition>;
		get totalSize():number;
		get size():number;
		get isClosed():boolean;
		get isUncoalesced():boolean;
		get pluginName():string|null|undefined;
		get layoutHints():LayoutHints|null|undefined;
		static reverse():Sort;
	}

	/**
	* Wrap BigDecimal values for use in JS. Provides text formatting for display and access to the underlying value.
	*/
	export class BigDecimalWrapper {
		constructor(value:unknown);

		getWrapped():unknown;
		valueOf():string;
		toString():string;
	}

	/**
	* Configuration object for running Table.treeTable to produce a hierarchical view of a given "flat" table.
	*/
	export class TreeTableConfig {
		idColumn:string;
		parentColumn:string;
		promoteOrphansToRoot:boolean;

		constructor();
	}

	export class DateWrapper extends LongWrapper {
		constructor(valueInNanos:unknown);

		static ofJsDate(date:Date):DateWrapper;
		asDate():Date;
	}

	/**
	* Event fired when a command is issued from the client.
	*/
	export class CommandInfo {
		constructor(code:string, result:Promise<dh.ide.CommandResult>);

		get result():Promise<dh.ide.CommandResult>;
		get code():string;
	}

	export class Client {
		static readonly EVENT_REQUEST_FAILED:string;
		static readonly EVENT_REQUEST_STARTED:string;
		static readonly EVENT_REQUEST_SUCCEEDED:string;
	}

	export interface LoginOptions {
		type: string;
		token?: string;
	}

	export class CoreClient implements HasEventHandling {
		static readonly EVENT_CONNECT:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_RECONNECT_AUTH_FAILED:string;
		static readonly EVENT_REFRESH_TOKEN_UPDATED:string;
		static readonly EVENT_REQUEST_FAILED:string;
		static readonly EVENT_REQUEST_STARTED:string;
		static readonly EVENT_REQUEST_SUCCEEDED:string;
		static readonly LOGIN_TYPE_PASSWORD:string;
		static readonly LOGIN_TYPE_ANONYMOUS:string;

		constructor(serverUrl:string);

		running():Promise<CoreClient>;
		getServerUrl():string;
		getAuthConfigValues():Promise<Array<Array<string>>>;
		login(credentials:LoginOptions):Promise<void>;
		relogin(token:RefreshToken):Promise<void>;
		onConnected(timeoutInMillis?:number):Promise<void>;
		getServerConfigValues():Promise<Array<[string, string]>>;
		getUserInfo():Promise<unknown>;
		getStorageService():dh.storage.StorageService;
		getAsIdeConnection():Promise<IdeConnection>;
		disconnect():void;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
	}

	export class QueryInfo {
		static readonly EVENT_TABLE_OPENED:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_CONNECT:string;

		constructor();
	}

	/**
	* Represents a non-viewport subscription to a table, and all data currently known to be present in the subscribed
	* columns. This class handles incoming snapshots and deltas, and fires events to consumers to notify of data changes.
	*
	* Unlike {@link TableViewportSubscription}, the "original" table does not have a reference to this instance, only the
	* "private" table instance does, since the original cannot modify the subscription, and the private instance must
	* forward data to it.
	*/
	export class TableSubscription implements HasEventHandling {
		static readonly EVENT_UPDATED:string;

		protected constructor();

		close():void;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		get columns():Array<Column>;
	}

	export class Column {
		protected constructor();
		static formatRowColor(expression:string):CustomColumn;

		get(row:Row):any;
		getFormat(row:Row):Format;
		sort():Sort;
		filter():FilterValue;
		formatColor(expression:string):CustomColumn;
		formatNumber(expression:string):CustomColumn;
		formatDate(expression:string):CustomColumn;
		toString():string;
		get constituentType():string;
		get name():string;
		get isPartitionColumn():boolean;
		get index():number;
		get description():string;
		get type():string;
	}

	export class IdeConnectionOptions {
		authToken:string;
		serviceId:string;

		constructor();
	}

	export class FilterValue {
		eq(term:FilterValue):FilterCondition;
		eqIgnoreCase(term:FilterValue):FilterCondition;
		notEq(term:FilterValue):FilterCondition;
		notEqIgnoreCase(term:FilterValue):FilterCondition;
		greaterThan(term:FilterValue):FilterCondition;
		lessThan(term:FilterValue):FilterCondition;
		greaterThanOrEqualTo(term:FilterValue):FilterCondition;
		lessThanOrEqualTo(term:FilterValue):FilterCondition;
		in(terms:FilterValue[]):FilterCondition;
		inIgnoreCase(terms:FilterValue[]):FilterCondition;
		notIn(terms:FilterValue[]):FilterCondition;
		notInIgnoreCase(terms:FilterValue[]):FilterCondition;
		contains(term:FilterValue):FilterCondition;
		containsIgnoreCase(term:FilterValue):FilterCondition;
		matches(pattern:FilterValue):FilterCondition;
		matchesIgnoreCase(pattern:FilterValue):FilterCondition;
		isTrue():FilterCondition;
		isFalse():FilterCondition;
		isNull():FilterCondition;
		invoke(method:string, ...args:FilterValue[]):FilterCondition;
		toString():string;
		static ofString(input:unknown):FilterValue;
		static ofNumber(input:unknown):FilterValue;
		static ofBoolean(b:unknown):FilterValue;
	}

	export class IdeSession implements HasEventHandling {
		static readonly EVENT_COMMANDSTARTED:string;
		static readonly EVENT_REQUEST_FAILED:string;

		protected constructor();

		getTable(name:string, applyPreviewColumns?:boolean):Promise<Table>;
		getFigure(name:string):Promise<dh.plot.Figure>;
		getTreeTable(name:string):Promise<TreeTable>;
		getHierarchicalTable(name:string):Promise<TreeTable>;
		getObject(definitionObject:dh.ide.VariableDefinition):Promise<any>;
		newTable(columnNames:string[], types:string[], data:string[][], userTimeZone:string):Promise<Table>;
		mergeTables(tables:Table[]):Promise<Table>;
		bindTableToVariable(table:Table, name:string):Promise<void>;
		subscribeToFieldUpdates(callback:(value:dh.ide.VariableChanges)=>void):()=>void;
		close():void;
		runCode(code:string):Promise<dh.ide.CommandResult>;
		onLogMessage(callback:(value:dh.ide.LogItem)=>void):()=>void;
		openDocument(params:object):void;
		changeDocument(params:object):void;
		getCompletionItems(params:object):Promise<Array<dh.lsp.CompletionItem>>;
		closeDocument(params:object):void;
		emptyTable(size:number):Promise<Table>;
		timeTable(periodNanos:number, startTime?:DateWrapper):Promise<Table>;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
	}

	/**
	* Behaves like a JsTable externally, but data, state, and viewports are managed by an entirely different mechanism, and
	* so reimplemented here.
	*
	* Any time a change is made, we build a new request and send it to the server, and wait for the updated state.
	*
	* Semantics around getting updates from the server are slightly different - we don't "unset" the viewport here after
	* operations are performed, but encourage the client code to re-set them to the desired position.
	*
	* The table size will be -1 until a viewport has been fetched.
	*/
	export class TreeTable implements HasEventHandling {
		static readonly EVENT_UPDATED:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_RECONNECTFAILED:string;
		static readonly EVENT_REQUEST_FAILED:string;

		protected constructor();

		expand(row:object, expandDescendants?:boolean):void;
		collapse(row:object):void;
		setExpanded(row:number|object, isExpanded:boolean, expandDescendants?:boolean):void;
		expandAll():void;
		collapseAll():void;
		isExpanded(row:object):boolean;
		setViewport(firstRow:number, lastRow:number, columns?:Array<Column>|null|undefined, updateInterval?:number|null|undefined):TableViewportSubscription;
		getViewportData():Promise<TreeViewportData>;
		close():void;
		applySort(sort:Sort[]):Array<Sort>;
		applyFilter(filter:FilterCondition[]):Array<FilterCondition>;
		findColumn(key:string):Column;
		findColumns(keys:string[]):Column[];
		/**
		* Provides Table-like selectDistinct functionality, but with a few quirks, since it is only fetching the distinct
		* values for the given columns in the source table:
		* <ul>
		* <li>Rollups may make no sense, since values are aggregated.</li>
		* <li>Values found on orphaned (and remvoed) nodes will show up in the resulting table, even though they are not in
		* the tree.</li>
		* <li>Values found on parent nodes which are only present in the tree since a child is visible will not be present
		* in the resulting table.</li>
		* </ul>
		*/
		selectDistinct(columns:Column[]):Promise<Table>;
		copy():Promise<TreeTable>;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		get filter():Array<FilterCondition>;
		get includeConstituents():boolean;
		get groupedColumns():Array<Column>;
		get size():number;
		get columns():Array<Column>;
		get description():string|null|undefined;
		get sort():Array<Sort>;
	}


	type AggregationOperationType = string;
	export class AggregationOperation {
		static readonly COUNT:AggregationOperationType;
		static readonly COUNT_DISTINCT:AggregationOperationType;
		static readonly DISTINCT:AggregationOperationType;
		static readonly MIN:AggregationOperationType;
		static readonly MAX:AggregationOperationType;
		static readonly SUM:AggregationOperationType;
		static readonly ABS_SUM:AggregationOperationType;
		static readonly VAR:AggregationOperationType;
		static readonly AVG:AggregationOperationType;
		static readonly STD:AggregationOperationType;
		static readonly FIRST:AggregationOperationType;
		static readonly LAST:AggregationOperationType;
		static readonly UNIQUE:AggregationOperationType;
		static readonly SKIP:AggregationOperationType;
	}

	type ValueTypeType = string;
	export class ValueType {
		static readonly STRING:ValueTypeType;
		static readonly NUMBER:ValueTypeType;
		static readonly DOUBLE:ValueTypeType;
		static readonly LONG:ValueTypeType;
		static readonly DATETIME:ValueTypeType;
		static readonly BOOLEAN:ValueTypeType;
	}

	type VariableTypeType = string;
	export class VariableType {
		static readonly TABLE:VariableTypeType;
		static readonly TREETABLE:VariableTypeType;
		static readonly HIERARCHICALTABLE:VariableTypeType;
		static readonly TABLEMAP:VariableTypeType;
		static readonly PARTITIONEDTABLE:VariableTypeType;
		static readonly FIGURE:VariableTypeType;
		static readonly OTHERWIDGET:VariableTypeType;
		static readonly PANDAS:VariableTypeType;
		static readonly TREEMAP:VariableTypeType;
	}

}

export namespace dh.ide {

	export interface VariableChanges {
		get removed():Array<VariableDefinition>;
		get created():Array<VariableDefinition>;
		get updated():Array<VariableDefinition>;
	}
	/**
	* Represents a serialized fishlib LogRecord, suitable for display on javascript clients.
	*/
	export interface LogItem {
		get logLevel():string;
		get micros():number;
		get message():string;
	}
	export interface CommandResult {
		get changes():VariableChanges;
		get error():string;
	}
	export interface VariableDefinition {
		name?:string;
		description?:string;
		id?:string;
		type:string;
		title?:string;
		applicationId?:string;
		applicationName?:string;
	}
}

export namespace dh.i18n {

	/**
	* Largely an exported wrapper for the GWT DateFormat, but also includes support for formatting nanoseconds as an
	* additional 6 decimal places after the rest of the number.
	*
	* Other concerns that this handles includes accepting a js Date and ignoring the lack of nanos, accepting a js Number
	* and assuming it to be a lossy nano value, and parsing into a js Date.
	*/
	export class DateTimeFormat {
		static readonly NANOS_PER_MILLI:number;

		constructor(pattern:string);

		static getFormat(pattern:string):DateTimeFormat;
		static format(pattern:string, date:object|number, timeZone?:TimeZone):string;
		static parseAsDate(pattern:string, text:string):Date;
		static parse(pattern:string, text:string, tz?:TimeZone):dh.DateWrapper;
		format(date:object, timeZone?:TimeZone):string;
		parse(text:string, tz?:TimeZone):dh.DateWrapper;
		parseAsDate(text:string):Date;
		toString():string;
	}

	/**
	* Exported wrapper of the GWT NumberFormat, plus LongWrapper support
	*/
	export class NumberFormat {
		constructor(pattern:string);

		static getFormat(pattern:string):NumberFormat;
		static parse(pattern:string, text:string):number;
		static format(pattern:string, number:object|number):string;
		parse(text:string):number;
		format(number:object):string;
		toString():string;
	}

	export class TimeZone {
		protected constructor();

		static getTimeZone(tzCode:string):TimeZone;
		get standardOffset():number;
		get id():string;
	}

}

export namespace dh.plot {

	export interface Series {
		get isLinesVisible():boolean|null|undefined;
		get pointLabelFormat():string|null|undefined;
		get shape():string;
		get sources():SeriesDataSource[];
		get lineColor():string;
		get yToolTipPattern():string|null|undefined;
		get shapeSize():number|null|undefined;
		get plotStyle():number;
		get oneClick():OneClick;
		get xToolTipPattern():string|null|undefined;
		get gradientVisible():boolean;
		get shapeColor():string;
		get isShapesVisible():boolean|null|undefined;
		get name():string;
		get multiSeries():MultiSeries;
		get shapeLabel():string;
		subscribe(): void;
	}
	export interface OneClick {
		setValueForColumn(columnName:string, value:any):void;
		getValueForColumn(columName:string):any;
		get requireAllFiltersToDisplay():boolean;
		get columns():dh.Column[];
	}
	export interface SeriesDataSource {
		get columnType():string;
		get axis():Axis;
		get type():number;
	}
	export interface FigureDataUpdatedEvent {
		getArray(series:Series, sourceType:number, mappingFunc?:(input:any)=>any):Array<any>;
		get series():Series[];
	}
	export interface MultiSeries {
		get name():string;
		get plotStyle():number;
	}
	export interface Axis {
		range(pixelCount?:number|null|undefined, min?:unknown|null|undefined, max?:unknown|null|undefined):void;
		get tickLabelAngle():number;
		get labelFont():string;
		get color():string;
		get invert():boolean;
		get log():boolean;
		get formatPattern():string|null|undefined;
		get maxRange():number;
		get label():string;
		get timeAxis():boolean;
		get type():number;
		get minorTicksVisible():boolean;
		get minorTickCount():number;
		get majorTickLocations():number[];
		get majorTicksVisible():boolean;
		get ticksFont():string;
		get gapBetweenMajorTicks():number|null|undefined;
		get id():string;
		get position():number;
		get businessCalendar():dh.calendar.BusinessCalendar;
		get formatType():number;
		get minRange():number;
	}

	export readonly class DownsampleOptions {
		/**
		* Max number of items in the series before DEFAULT will not attempt to load the series without downsampling. Above
		* this size if downsample fails or is not applicable, the series won't be loaded unless DISABLE is passed to
		* series.subscribe().
		*/
		static MAX_SERIES_SIZE:number;
		/**
		* Max number of items in the series where the subscription will be allowed at all. Above this limit, even with
		* downsampling disabled, the series will not load data.
		*/
		static MAX_SUBSCRIPTION_SIZE:number;
		/**
		* Flag to let the API decide what data will be available, based on the nature of the data, the series, and how the
		* axes are configured.
		*/
		static readonly DEFAULT:DownsampleOptions;
		/**
		* Flat to entirely disable downsampling, and force all data to load, no matter how many items that would be, up to
		* the limit of MAX_SUBSCRIPTION_SIZE.
		*/
		static readonly DISABLE:DownsampleOptions;
	}

	export class AxisDescriptor {
		formatType:string;
		type:string;
		position:string;
		log?:boolean;
		label?:string;
		labelFont?:string;
		ticksFont?:string;
		formatPattern?:string;
		color?:string;
		minRange?:number;
		maxRange?:number;
		minorTicksVisible?:boolean;
		majorTicksVisible?:boolean;
		minorTickCount?:number;
		gapBetweenMajorTicks?:number;
		majorTickLocations?:Array<number>;
		tickLabelAngle?:number;
		invert?:boolean;
		isTimeAxis?:boolean;

		constructor();
	}

	export class Chart implements dh.HasEventHandling {
		static readonly EVENT_SERIES_ADDED:string;

		protected constructor();

		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		get column():number;
		get showLegend():boolean;
		get axes():Axis[];
		get is3d():boolean;
		get titleFont():string;
		get title():string|null|undefined;
		get colspan():number;
		get titleColor():string;
		get series():Series[];
		get rowspan():number;
		get chartType():number;
		get row():number;
		get legendColor():string;
		get legendFont():string;
		get multiSeries():MultiSeries[];
	}

	export class SeriesDescriptor {
		plotStyle:string;
		name:string;
		linesVisible?:boolean;
		shapesVisible?:boolean;
		gradientVisible?:boolean;
		lineColor?:string;
		pointLabelFormat?:string;
		xToolTipPattern?:string;
		yToolTipPattern?:string;
		shapeLabel?:string;
		shapeSize?:number;
		shapeColor?:string;
		shape?:string;
		dataSources:Array<SourceDescriptor>;

		constructor();
	}

	export class Figure implements dh.HasEventHandling {
		static readonly EVENT_UPDATED:string;
		static readonly EVENT_SERIES_ADDED:string;
		static readonly EVENT_DISCONNECT:string;
		static readonly EVENT_RECONNECT:string;
		static readonly EVENT_RECONNECTFAILED:string;
		static readonly EVENT_DOWNSAMPLESTARTED:string;
		static readonly EVENT_DOWNSAMPLEFINISHED:string;
		static readonly EVENT_DOWNSAMPLEFAILED:string;
		static readonly EVENT_DOWNSAMPLENEEDED:string;

		protected constructor();

		getErrors():string[];
		subscribe(forceDisableDownsample?:DownsampleOptions):void;
		unsubscribe():void;
		close():void;
		addEventListener(name:string, callback:(e:CustomEvent)=>void):()=>void;
		nextEvent(eventName:string, timeoutInMillis?:number):Promise<CustomEvent>;
		hasListeners(name:string):boolean;
		removeEventListener(name:string, callback:(e:CustomEvent)=>void):boolean;
		get charts():Chart[];
		get updateInterval():number;
		get titleColor():string;
		get titleFont():string;
		get title():string|null|undefined;
		get rows():number;
		get cols():number;
		static create(config:FigureDescriptor):Promise<Figure>;
	}

	export class ChartDescriptor {
		colspan?:number;
		rowspan?:number;
		series:Array<SeriesDescriptor>;
		axes:Array<AxisDescriptor>;
		chartType:string;
		title?:string;
		titleFont?:string;
		titleColor?:string;
		showLegend?:boolean;
		legendFont?:string;
		legendColor?:string;
		is3d?:boolean;

		constructor();
	}

	export class FigureSourceException {
		table:dh.Table;
		source:SeriesDataSource;

		protected constructor();
	}

	/**
	* A descriptor used with JsFigureFactory.create to create a figure from JS.
	*/
	export class FigureDescriptor {
		title:string;
		titleFont?:string;
		titleColor?:string;
		isResizable?:boolean;
		isDefaultTheme?:boolean;
		updateInterval?:number;
		cols?:number;
		rows?:number;
		charts:Array<ChartDescriptor>;

		constructor();
	}

	/**
	* Helper class to manage snapshots and deltas and keep not only a contiguous JS array of data per column in the
	* underlying table, but also support a mapping function to let client code translate data in some way for display and
	* keep that cached as well.
	*/
	export class ChartData {
		constructor(table:dh.Table);

		update(tableData:dh.SubscriptionTableData):void;
		getColumn(columnName:string, mappingFunc:(input:any)=>any, currentUpdate:dh.TableData):Array<any>;
		/**
		* Removes some column from the cache, avoiding extra computation on incoming events, and possibly freeing some
		* memory. If this pair of column name and map function are requested again, it will be recomputed from scratch.
		*/
		removeColumn(columnName:string, mappingFunc:(input:any)=>any):void;
	}

	export class SeriesDataSourceException {
		protected constructor();

		get source():SeriesDataSource;
		get message():string;
	}

	export class FigureFetchError {
		error:object;
		errors:Array<string>;

		protected constructor();
	}

	export class SourceDescriptor {
		axis:AxisDescriptor;
		table:dh.Table;
		columnName:string;
		type:string;

		constructor();
	}


	type SeriesPlotStyleType = number;
	export class SeriesPlotStyle {
		static readonly BAR:SeriesPlotStyleType;
		static readonly STACKED_BAR:SeriesPlotStyleType;
		static readonly LINE:SeriesPlotStyleType;
		static readonly AREA:SeriesPlotStyleType;
		static readonly STACKED_AREA:SeriesPlotStyleType;
		static readonly PIE:SeriesPlotStyleType;
		static readonly HISTOGRAM:SeriesPlotStyleType;
		static readonly OHLC:SeriesPlotStyleType;
		static readonly SCATTER:SeriesPlotStyleType;
		static readonly STEP:SeriesPlotStyleType;
		static readonly ERROR_BAR:SeriesPlotStyleType;
		static readonly TREEMAP:SeriesPlotStyleType;
	}

	type SourceTypeType = number;
	export class SourceType {
		static readonly X:SourceTypeType;
		static readonly Y:SourceTypeType;
		static readonly Z:SourceTypeType;
		static readonly X_LOW:SourceTypeType;
		static readonly X_HIGH:SourceTypeType;
		static readonly Y_LOW:SourceTypeType;
		static readonly Y_HIGH:SourceTypeType;
		static readonly TIME:SourceTypeType;
		static readonly OPEN:SourceTypeType;
		static readonly HIGH:SourceTypeType;
		static readonly LOW:SourceTypeType;
		static readonly CLOSE:SourceTypeType;
		static readonly SHAPE:SourceTypeType;
		static readonly SIZE:SourceTypeType;
		static readonly LABEL:SourceTypeType;
		static readonly COLOR:SourceTypeType;
		static readonly PARENT:SourceTypeType;
		static readonly HOVER_TEXT:SourceTypeType;
		static readonly TEXT:SourceTypeType;
	}

	type AxisPositionType = number;
	export class AxisPosition {
		static readonly TOP:AxisPositionType;
		static readonly BOTTOM:AxisPositionType;
		static readonly LEFT:AxisPositionType;
		static readonly RIGHT:AxisPositionType;
		static readonly NONE:AxisPositionType;
	}

	type ChartTypeType = number;
	export class ChartType {
		static readonly XY:ChartTypeType;
		static readonly PIE:ChartTypeType;
		static readonly OHLC:ChartTypeType;
		static readonly CATEGORY:ChartTypeType;
		static readonly XYZ:ChartTypeType;
		static readonly CATEGORY_3D:ChartTypeType;
		static readonly TREEMAP:ChartTypeType;
	}

	type AxisFormatTypeType = number;
	export class AxisFormatType {
		static readonly CATEGORY:AxisFormatTypeType;
		static readonly NUMBER:AxisFormatTypeType;
	}

	type AxisTypeType = number;
	export class AxisType {
		static readonly X:AxisTypeType;
		static readonly Y:AxisTypeType;
		static readonly SHAPE:AxisTypeType;
		static readonly SIZE:AxisTypeType;
		static readonly LABEL:AxisTypeType;
		static readonly COLOR:AxisTypeType;
	}

}


export namespace dh.lsp {

	export class Position {
		line:number;
		character:number;

		constructor();

		lessThan(start:Position):boolean;
		lessOrEqual(start:Position):boolean;
		greaterThan(end:Position):boolean;
		greaterOrEqual(end:Position):boolean;
		copy():Position;
	}

	export class TextDocumentContentChangeEvent {
		range:Range;
		rangeLength:number;
		text:string;

		constructor();
	}

	export class TextEdit {
		range:Range;
		text:string;

		constructor();
	}

	export class CompletionItem {
		label:string;
		kind:number;
		detail:string;
		documentation:string;
		deprecated:boolean;
		preselect:boolean;
		textEdit:TextEdit;
		sortText:string;
		filterText:string;
		insertTextFormat:number;
		commitCharacters:object;
		additionalTextEdits:object;

		constructor();

		addAdditionalTextEdits(...edit:TextEdit[]):void;
	}

	export class Range {
		start:Position;
		end:Position;

		constructor();

		isInside(innerStart:Position, innerEnd:Position):boolean;
	}

}

export namespace dh.calendar {

	export interface Holiday {
		get date():dh.LocalDateWrapper;
		get businessPeriods():Array<BusinessPeriod>;
	}
	export interface BusinessCalendar {
		get holidays():Array<Holiday>;
		get name():string;
		get businessDays():Array<string>;
		get timeZone():dh.i18n.TimeZone;
		get businessPeriods():Array<BusinessPeriod>;
	}
	export interface BusinessPeriod {
		get close():string;
		get open():string;
	}

	type DayOfWeekType = string;
	export class DayOfWeek {
		static readonly SUNDAY:DayOfWeekType;
		static readonly MONDAY:DayOfWeekType;
		static readonly TUESDAY:DayOfWeekType;
		static readonly WEDNESDAY:DayOfWeekType;
		static readonly THURSDAY:DayOfWeekType;
		static readonly FRIDAY:DayOfWeekType;
		static readonly SATURDAY:DayOfWeekType;
		static readonly values():DayOfWeekType[];
	}

}

