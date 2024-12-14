package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.BPjs;
import il.ac.bgu.cs.bp.bpjs.bprogramio.BProgramSyncSnapshotCloner;
import il.ac.bgu.cs.bp.bpjs.internal.ExecutorServiceMaker;
import il.ac.bgu.cs.bp.bpjs.internal.Pair;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgramSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.SyncStatement;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.EventSelectionResult;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.SimpleEventSelectionStrategy;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSet;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSets;
import il.ac.bgu.cs.bp.chess.eventSets.DevelopPawns;
import il.ac.bgu.cs.bp.chess.eventSets.FianchettoPawns;
import il.ac.bgu.cs.bp.chess.eventSets.StrengthenPawns;
import org.json.JSONArray;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.NativeObject;
import org.mozilla.javascript.Scriptable;

import java.text.DecimalFormat;
import java.text.MessageFormat;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toSet;

// data : some game data | [state 1 attributes], ..., [state n attributes] | index of best

public class ChessEventSelectionStrategy extends SimpleEventSelectionStrategy {
  private static final AtomicInteger INSTANCE_COUNTER = new AtomicInteger(0);
  private static final DecimalFormat df2 = new DecimalFormat("#.##");
  private final String gameId;
  private final Rule[] rules = new Rule[]
      {
          // counter, advice
          // Rule 1 - developed enough pawns
          new Rule("Developed enough pawns",
              "As a rule of thumb, it is not favorable to move / develop too " +
                  "many pawns at the opening, 3 is certainly enough",
              (store, events) -> {
                var es = new DevelopPawns();
                var advisorDevelop = (double) store.get("Advisor: Center");
                return Optional.of(new Pair<>(0.5 * advisorDevelop, es));
              }),
          new Rule("Center is strengthened",
              "The center has been strengthened by 4 moves, it may be time to try and " +
                  "get other strategies into play", (store, events) -> {
            var es = new StrengthenPawns();
            var advisorCenter = (double) store.get("Advisor: Center");
            return Optional.of(new Pair<>(0.3 * advisorCenter, es));
          }),
          new Rule("Fianchetto strategy advanced",
              "The Fianchetto strategy advanced by the player, it may be time to try and " +
                  "get other strategies into play", (store, events) -> {
            var es = new FianchettoPawns();
            var advisorFianchetto = (double) store.get("Advisor: Fianchetto");
            return Optional.of(new Pair<>(0.1 * advisorFianchetto, es));
          }),
//                    new Rule("Don't bring your queen out too early",
//                            "You should not move your queen too many times in the opening",
//                            (store, events) -> {
//                                var queenMoves = (int) store.get("Counter: Queen moves");
//                                var advisorQueen = (double) store.get("Piece Advisor: Queen");
//                                if (queenMoves >= 2)
//                                    return Optional.of(new Pair(0.2 * advisorQueen, ));
//                            }),
      };
  private ExecutorService execSvc;
  private int defaultPriority = Integer.MIN_VALUE;
  private Optional<BEvent> maxEvent;
  private List<String> gameData;

  public ChessEventSelectionStrategy(String gameId) {
    this.execSvc = new ExecutorServiceMaker().makeWithName("ChessEventSelectionStrategy-" + INSTANCE_COUNTER.getAndIncrement());
    this.gameId = gameId;
    gameData = new LinkedList<>();
  }

  private static String toJson(BEvent o) {
    String code = toJson((Scriptable) o.maybeData);
    return "{\"name\": \"" + o.name + "\"" + (code == null ? "}" : ", \"data\":" + code + "}");
  }

  private static String toJson(Scriptable o) {
    if (o == null) return null;
    String code = "JSON.stringify(o);";
    try {
      Context curCtx = BPjs.enterRhinoContext();
      Scriptable tlScope = BPjs.makeBPjsSubScope();
      tlScope.put("o", tlScope, o);
      // Benny : The problem is here, the execution throws exception, so the functions returns null every time
      return (String) curCtx.evaluateString(tlScope, code, "", 1, (Object) null);
    } catch (Exception e) {
      return null;
    } finally {
      Context.exit();
    }
  }

  public List<String> getGameData() {
    return gameData;
  }

  @Override
  public Set<BEvent> selectableEvents(BProgramSyncSnapshot bpss) {

    Set<SyncStatement> statements = bpss.getStatements();
    List<BEvent> externalEvents = bpss.getExternalEvents();

    EventSet blocked = EventSets.anyOf(statements.stream()
        .filter(stmt -> stmt != null)
        .map(SyncStatement::getBlock)
        .filter(r -> r != EventSets.none)
        .collect(toSet()));

    OptionalInt maxValueOpt = statements.stream()
        .filter(s -> !getRequestedAndNotBlocked(s, blocked).isEmpty())
        .mapToInt(this::getValue)
        .max();

    try {
      BPjs.enterRhinoContext();
      if (maxValueOpt.isPresent()) {
        int maxValue = maxValueOpt.getAsInt();
        maxEvent = statements.stream().filter(s -> getValue(s) == maxValue)
            .flatMap(s -> getRequestedAndNotBlocked(s, blocked).stream()).findFirst();
      } else {
        maxEvent = Optional.empty();
      }
    } finally {
      Context.exit();
    }
    return super.selectableEvents(bpss);
  }

  private int getValue(SyncStatement stmt) {
    return (stmt.hasData() && (stmt.getData() instanceof Number)) ?
        ((Number) stmt.getData()).intValue() : defaultPriority;
  }

  public int getDefaultPriority() {
    return defaultPriority;
  }

  public void setDefaultPriority(int defaultPriority) {
    this.defaultPriority = defaultPriority;
  }

  private String toJson(BProgramSyncSnapshot bpss, Map<BEvent, BProgramSyncSnapshot> nextBpss, Set<BEvent> selectableEvents) {
    StringJoiner joiner = new StringJoiner(",");
    for (BEvent selectableEvent : selectableEvents) {
      String s = toJson(selectableEvent);
      joiner.add(s);
    }
    String selectableEventsString = joiner.toString();

    String selectedEvent = toJson(maxEvent.get());

    String currentAttributes = toJson(bpss.getDataStore(), true);

    var nextAttributes = nextBpss.entrySet().stream()
        .map(entry -> MessageFormat.format("'{' \"event\": {0}, \"Attributes\": [{1}]'}'", toJson(entry.getKey()), toJson(entry.getValue().getDataStore(), false)))
        .collect(Collectors.joining(", "));

    return (MessageFormat.format("'{' \"SelectableEvents\": [{0}]," +
            "\"CurrentAttributes\": {1}," +
            "\"SelectableEventsLookAhead\": [{2}]," +
            "\"SelectedEvent\":  {3} '}'",
        selectableEventsString, currentAttributes, nextAttributes, selectedEvent
    ));
  }

  private String toJson(Object obj) {
    if (obj instanceof NativeObject) {
      return toJson((NativeObject) obj);
    } else if (obj instanceof Double) {
      return obj.toString();
    }else if(obj instanceof Collection) {
      return new JSONArray(((Collection)obj).stream().map(this::toJson).toArray()).toString();
    } else {
      throw new IllegalArgumentException("unsupported type " + obj);
    }

  }

  private String toJson(Map<String, Object> dataStore, boolean includeMinorAttributes) {
    var modifiedEntrySet = dataStore.entrySet();
    var pred = new MyEntryPredicate();
    if (!includeMinorAttributes) {
      Map<String, Object> newDataStore = dataStore.entrySet().stream().filter(pred).collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
      modifiedEntrySet = newDataStore.entrySet();
    }
    return modifiedEntrySet.stream().filter(entry -> !(entry.getKey().startsWith("NON")))
        .map(e -> "\"" + e.getKey() + "\":" + toJson(e.getValue()))
        .collect(Collectors.joining(",", "{", "}"));
  }

  @Override
  public Optional<EventSelectionResult> select(BProgramSyncSnapshot bpss, Set<BEvent> selectableEvents) {
    // System.out.println("--------------------------------- Select ---------------------------------");

    // Initialize probabilities of all events to 1
    Map<BEvent, Double> initialProbabilities;

    /*
     * Sometimes, select function is reached without any moves are requested, for example in case of a
     * _____CTX_LOCK_____ event. In this case, we need to catch the event, and continue.
     */

    Iterator<BEvent> iterator = selectableEvents.iterator();

    if (selectableEvents.size() == 1 && !(iterator.next().name.toLowerCase().startsWith("move"))) {
      return Optional.of(new EventSelectionResult(selectableEvents.iterator().next()));
    } else if (selectableEvents.size() == 0) {
      // No selectable events
      return super.select(bpss, selectableEvents);
    } else {
      // System.out.println("--------------------------------- Select ( |Selectable Moves| >= 1 ) ---------------------------------");
      //System.out.println(selectableEvents);
      //System.out.println(selectableEvents.size());
      initialProbabilities = selectableEvents.stream().collect(Collectors.toMap(Function.identity(), e -> 1.0));
      var nextBpss = selectableEvents.stream()
          .collect(Collectors.toMap(Function.identity(), e -> {
            try {
              var clonedBpss = BProgramSyncSnapshotCloner.clone(bpss);
              return clonedBpss.triggerEvent(e, execSvc, new ArrayList<>(),
                      clonedBpss.getBProgram().getStorageModificationStrategy());
            } catch (InterruptedException ex) {
              ex.printStackTrace();
              System.exit(1);
              return null;
            }
          }));
      // System.out.println("--------------------------------- Select ( Finished Init ) ---------------------------------");
      var singleGameData = toJson(bpss, nextBpss, selectableEvents);
      gameData.add(singleGameData);
    }

    // System.out.println("--------------------------------- Select ( Finished Init ) ---------------------------------");

    // Event sets
    DevelopPawns esDevelop = new DevelopPawns();
    FianchettoPawns esFianchetto = new FianchettoPawns();
    StrengthenPawns esCenter = new StrengthenPawns();

//       JSONArray selectableEventsJSON = new JSONArray();

    // String selectableEventsString = selectableEvents.stream().map(ChessEventSelectionStrategy::toJson).collect(Collectors.joining(",", "[", "]"));


        /*for (BEvent e : selectableEvents) {
            JSONObject selectableMove = new JSONObject();
            selectableMove.put("Selectable Event, name", e.name);
            Map<String, Object> dataMap = e.getDataField().isPresent() ? (Map<String, Object>) e.getData() : null;
            JSONObject selectableMoveData = new JSONObject();
            selectableMoveData.put("Piece", dataMap.get("piece").toString());
            selectableMoveData.put("src", dataMap.get("src").toString());
            selectableMoveData.put("dst", dataMap.get("dst").toString());
            selectableMove.put("Selectable Event, data", selectableMoveData);
            selectableEventsJSON.add(selectableMove);
            System.out.println(e.toString());
        }*/

        /*System.out.println("--------------------------------- selectableEvents ---------------------------------");
        for (BEvent e : selectableEvents) {
            System.out.print("| " + e.name + " " + ScriptableUtils.stringify(e.maybeData) + " |");
            if (esDevelop.contains(e)) System.out.print("\t=> Developing");
            if (esFianchetto.contains(e)) System.out.print("\t, Fianchetto");
            if (esCenter.contains(e)) System.out.print("\t, Center");
            System.out.print("\n");
        }
        System.out.println("--------------------------------- Finished ---------------------------------");*/

       /* var counterDevelop = ctx.get("Strategy Counter: Developing moves");
        var counterCenter = ctx.get("Strategy Counter: Center strengthen moves");
        System.out.println("center moves -> " + counterCenter);
        var counterFianchetto = ctx.get("Strategy Counter: Fianchetto moves");
        System.out.println("Fianchetto moves -> " + counterFianchetto);
        var advisorCenter = ctx.get("Advisor: Center");
        System.out.println("Center Advice => " + advisorCenter);
        var advisorDevelop = ctx.get("Advisor: Develop");
        System.out.println("Develop Advice => " + advisorDevelop);
        var advisorFianchetto = ctx.get("Advisor: Fianchetto");
        System.out.println("Fianchetto Advice => " + advisorFianchetto);*/

//        // Now it's time to apply the rules
//        for (Rule rule : rules) {
//            var res = rule.rule.apply(ctx, selectableEvents);
//            if (res.isPresent()) {
//                EventSet es = res.get().getRight();
//                initialProbabilities = initialProbabilities.entrySet().stream()
//                        .collect(Collectors.toMap(Map.Entry::getKey, e -> {
//                            if (es.contains(e.getKey()))
//                                return e.getValue() + res.get().getLeft();
//                            return e.getValue();
//                        }));
//            }
//        }

    Map<BEvent, Double> probabilities = normalize(initialProbabilities);

        /*System.out.println("~~~~~~~~~~~~~~~~~~~~~~ Probabilities ~~~~~~~~~~~~~~~~~~~~~~");
        for (BEvent e : probabilities.keySet()) {
            String key = e.name;
            Object data = null;
            if (e.getDataField().isPresent()) {
                data = e.getDataField().get();
            }
            Double value = probabilities.get(e);
            System.out.println(key + " " + ScriptableUtils.stringify(data) + " " + df2.format(value).toString());
        }
        if (probabilities.size() == 0) {
            System.out.println("empty => Choose randomly");
        }
        //System.out.println("~~~~~~~~~~~~~~~~~~~~~~~~ Finished ~~~~~~~~~~~~~~~~~~~~~~~~");*/


        /*double rnd = Math.random();
        double sum = 0;
        List<BEvent> events = new ArrayList<>(probabilities.keySet());
        for (int i = 0; i < events.size(); i++) {
            sum += probabilities.get(events.get(i));
            if (sum > rnd) {
                if (maxEvent.isPresent()) {
                    System.out.println("Max Event is present (1) -- " + maxEvent.get());
                    JSONObject selectedMove = new JSONObject();
                    selectedMove.put("name of chosen move", maxEvent.get().name);
                    selectedMove.put("data of chosen move", maxEvent.get().maybeData);
                    gameSequenceJsons.add(selectedMove);

                    FileWriter JSONWriter = null;
                    try {
                        JSONWriter = new FileWriter("C:\\Users\\benis\\Desktop\\University\\Thesis\\Bpjs-Chess\\MeasurementsArray.json", true);
                        JSONWriter.write(gameSequenceJsons.toJSONString());
                        JSONWriter.flush();
                        JSONWriter.close();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                    return Optional.of(new EventSelectionResult(maxEvent.get()));
                }
                return Optional.of(new EventSelectionResult(events.get(Math.max(i - 1, 0))));
            }
        }*/
    /*
      ctx includes a lot of information that should help to decide which BEvent to select next

      3 Strategies for now ;
        1. Developing pieces
        2. Center capturing / strengthening
        3. Fianchetto

      Considerations:
        1. pawn moves >= 3 && ->
              increase development prob. , decrease center prob.

        2. g / b column pawn moves >= 1 ->
              increase fianchetto prob. , decrease center prob.

        2. knight, bishop, rook ( minor pieces ) moves >= 2 ->
              increase strengthen center prob. , decrease development prob.

        3. queen moves > 1 ->
              increase development prob. by a lot, decrease both center and fianchetto prob.

        4. fianchetto influence pieces ( pawn, knight, rook , queen ) >= 2 ->
              increase fianchetto prob. , decrease development prob.

        5. strengthen center >= 2 ->
              increase fianchetto prob. , decrease center prob.

        6. (if possible to check) Pawn on d3 / e3 ->
              increase fianchetto prob. , decrease development prob.

        To do that, we first encounter the fact that we need few counters.
        Some of those counters share the same subset of moves to count.

        |> Pawn moves counter
        |> Knight moves counter
        |> Bishop moves counter
        |> Rook moves counter
        |> Queen moves counter


        |> Minor pieces ( all of the above except queen ) moves counter
        |> fianchetto influence pieces ( all of the above except queen and bishop ) moves counter

        |> Counter for each strategy moves
    */

    //if (maxEvent.isPresent()) {
    if (maxEvent != null) {
//            System.out.println("Max Event is present -- " + maxEvent.get());
//            gameData += toJsonContinuation(maxEvent.get());
      return Optional.of(new EventSelectionResult(maxEvent.get()));
    }

    return super.select(bpss, selectableEvents);
  }

  private Map<BEvent, Double> normalize(Map<BEvent, Double> map) {
    double sum = 0;
    for (Map.Entry<BEvent, Double> entry : map.entrySet()) {
      sum += Math.abs(entry.getValue());
    }
    for (Map.Entry<BEvent, Double> entry : map.entrySet()) {
      entry.setValue(entry.getValue() / sum);
    }
    return map;
  }

  private static class Rule {
    public final String title;
    public final String description;
    public final BiFunction<Map<String, Object>, Set<BEvent>, Optional<Pair<Double, EventSet>>> rule;

    private Rule(String title, String description, BiFunction<Map<String, Object>, Set<BEvent>, Optional<Pair<Double, EventSet>>> rule) {
      this.title = title;
      this.description = description;
      this.rule = rule;
    }
  }

  private static class MyEntryPredicate implements Predicate<Map.Entry<String, Object>> {
    private MyEntryPredicate() {
    }

    @Override
    public boolean test(Map.Entry<String, Object> input) {
      return !input.getKey().startsWith("CTX") && !input.getKey().startsWith("transaction");
    }
  }
}
