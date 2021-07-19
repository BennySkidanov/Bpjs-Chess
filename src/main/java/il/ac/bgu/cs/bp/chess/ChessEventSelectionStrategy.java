package il.ac.bgu.cs.bp.chess;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import il.ac.bgu.cs.bp.bpjs.internal.Pair;
import il.ac.bgu.cs.bp.bpjs.internal.ScriptableUtils;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgramSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.EventSelectionResult;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.SimpleEventSelectionStrategy;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSet;
import il.ac.bgu.cs.bp.chess.eventSets.DevelopBishops;
import il.ac.bgu.cs.bp.chess.eventSets.DevelopPawns;
import il.ac.bgu.cs.bp.chess.eventSets.FianchettoPawns;
import il.ac.bgu.cs.bp.chess.eventSets.StrengthenPawns;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.text.DecimalFormat;
import java.util.*;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ChessEventSelectionStrategy extends SimpleEventSelectionStrategy {

    private final String gameId;
    private OutputStream file;

    private static FileWriter writer;

    public ChessEventSelectionStrategy(String gameId, OutputStream file) {
        this.gameId = gameId;
        this.file = file;
    }
    
    private static DecimalFormat df2 = new DecimalFormat("#.##");

    private final Rule[] rules = new Rule[]
            {
                    // counter, advice
                    // Rule 1 - developed enough pawns
                    new Rule("Developed enough pawns",
                            "As a rule of thumb, it is not favorable to move / develop too " +
                                    "many pawns at the opening, 3 is certainly enough",
                            (store, events) -> {
                                    var es = new DevelopPawns();
                                    var advisorDevelop = (double)store.get("Advisor: Center");
                                    return Optional.of(new Pair(0.1 * advisorDevelop, es));
                            }),
                    new Rule("Center is strengthened",
                            "The center has been strengthened by 4 moves, it may be time to try and " +
                                    "get other strategies into play", (store, events) -> {
                            var es = new StrengthenPawns();
                            var advisorCenter = (double)store.get("Advisor: Center");
                            return Optional.of(new Pair(0.1 * advisorCenter, es));
                    }),
                    new Rule("Fianchetto strategy advanced",
                            "The Fianchetto strategy advanced by the player, it may be time to try and " +
                                    "get other strategies into play", (store, events) -> {
                            var es = new FianchettoPawns();
                            var advisorFianchetto = (double)store.get("Advisor: Fianchetto");
                            return Optional.of(new Pair(0.05 * advisorFianchetto, es));
                    }),
                    new Rule("Rule 4",
                            "ddd",
                            (store, events) -> {
                        var es = new DevelopBishops();
                        var advisorBishop = (double)store.get("Piece Advisor: Bishop");
                        return Optional.of(new Pair(0.2 * advisorBishop, es));
                    }),
            };


    @Override
    public Optional<EventSelectionResult> select(BProgramSyncSnapshot bpss, Set<BEvent> selectableEvents) {
        // System.out.println("--------------------------------- Select ---------------------------------");
        // Initialize probabilities of all events to 1
        Map<BEvent, Double> initialProbabilities;
        JSONArray gameSequenceJsons = new JSONArray();
        if (selectableEvents.size() == 1) {
            var toPrint = false;
            var ctx = bpss.getDataStore();
            var counterDevelop = ctx.get("Strategy Counter: Developing moves");
            var counterCenter = ctx.get("Strategy Counter: Center strengthen moves");
            var counterFianchetto = ctx.get("Strategy Counter: Fianchetto moves");
            var advisorCenter = ctx.get("Advisor: Center");;
            var advisorDevelop = ctx.get("Advisor: Develop");
            var advisorFianchetto = ctx.get("Advisor: Fianchetto");
            for (BEvent e : selectableEvents) {
                if(e.name.equals("Move")) toPrint = true;
            }
            if(toPrint) {
                try {
                    var data = (Map<String,Object>) selectableEvents.iterator().next().maybeData;
                    var piece = (Map<String,Object>)data.get("piece");
                    JSONObject move = new JSONObject();
                    move.put("Move", data.get("dst"));
                    move.put("Developing moves counter", counterDevelop.toString());
                    move.put("Center moves counter", counterCenter.toString());
                    move.put("Fianchetto moves counter", counterFianchetto.toString());
                    move.put("Advisor - Develop", advisorDevelop.toString());
                    move.put("Advisor - Center", advisorCenter.toString());
                    move.put("Advisor - Fianchetto", advisorFianchetto.toString());
/*                    file.write(("Move : " + data.get("dst") + "\n" +
                            "Developing moves : " + counterDevelop.toString() + ", " +
                            "Center moves : " + counterCenter.toString() + ", " +
                            "Fianchetto moves : " + counterFianchetto.toString() + ", " +
                            "Advisor - Center : " + advisorCenter.toString() + ", " +
                            "Advisor - Develop : " + advisorDevelop.toString() + ", " +
                            "Advisor - Fianchetto : " + advisorFianchetto.toString() +
                            "\n\n").getBytes());*/
                    PrintWriter clear = new PrintWriter(file);
                    clear.print("");
                    clear.close();

                    writer = new FileWriter("C:\\Users\\benis\\Desktop\\University\\Thesis\\Bpjs-Chess\\Measurements.txt", true);
                    writer.flush();
                    Gson gson = new GsonBuilder().setPrettyPrinting().create();
                    JsonParser jp = new JsonParser();
                    JsonElement je = jp.parse("{ Move :" + data.get("dst") + ",\n" + "number:0"  + "}" );

                    String prettyJsonString = gson.toJson(je);

                    writer.write(je + "\n\n");

                    writer.close();
                    System.out.println(prettyJsonString);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            // Simulating PGN, only one move to choose
            return Optional.of(new EventSelectionResult(selectableEvents.iterator().next()));
        }
        else if (selectableEvents.size() == 0) { // no selectable events
            return super.select(bpss, selectableEvents);
        } else {
            initialProbabilities = selectableEvents.stream().collect(Collectors.toMap(Function.identity(), e -> 1.0));
        }

        // ctx var to access global system data
        var ctx = bpss.getDataStore();

        // Event sets
        DevelopPawns esDevelop = new DevelopPawns();
        FianchettoPawns esFianchetto = new FianchettoPawns();
        StrengthenPawns esCenter = new StrengthenPawns();

        System.out.println("--------------------------------- selectableEvents ---------------------------------");
        for (BEvent e : selectableEvents) {
            System.out.print("| " + e.name + " " + ScriptableUtils.stringify(e.maybeData) + " |");
            if (esDevelop.contains(e)) System.out.print("\t=> Developing");
            if (esFianchetto.contains(e)) System.out.print("\t, Fianchetto");
            if (esCenter.contains(e)) System.out.print("\t, Center");
            System.out.print("\n");
        }
        System.out.println("--------------------------------- Finished ---------------------------------");

        var counterDevelop = ctx.get("Strategy Counter: Developing moves");
        System.out.println("Developing moves -> " + counterDevelop);
        try {
            file.write(("Developing moves -> " + counterDevelop.toString() + "\n").getBytes());
        } catch (IOException e) {
            e.printStackTrace();
        }
        var counterCenter = ctx.get("Strategy Counter: Center strengthen moves");
        System.out.println("center moves -> " + counterCenter);
        var counterFianchetto = ctx.get("Strategy Counter: Fianchetto moves");
        System.out.println("Fianchetto moves -> " + counterFianchetto);
        var advisorCenter = ctx.get("Advisor: Center");
        System.out.println("Center Advice => " + advisorCenter);
        var advisorDevelop = ctx.get("Advisor: Develop");
        System.out.println("Develop Advice => " + advisorDevelop);
        var advisorFianchetto = ctx.get("Advisor: Fianchetto");
        System.out.println("Fianchetto Advice => " + advisorFianchetto);

        // Now it's time to apply the rules
        for (Rule rule : rules) {
            var res = rule.rule.apply(ctx, selectableEvents);
            if (res.isPresent()) {
                EventSet es = res.get().getRight();
                initialProbabilities = initialProbabilities.entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, e -> {
                            if (es.contains(e.getKey()))
                                return e.getValue() + res.get().getLeft();
                            return e.getValue();
                        }));
            }
        }

        Map<BEvent, Double> probabilities = normalize(initialProbabilities);

        System.out.println("~~~~~~~~~~~~~~~~~~~~~~ Probabilities ~~~~~~~~~~~~~~~~~~~~~~");
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
        System.out.println("~~~~~~~~~~~~~~~~~~~~~~~~ Finished ~~~~~~~~~~~~~~~~~~~~~~~~");


        double rnd = Math.random();
        double sum = 0;
        List<BEvent> events = new ArrayList<>(probabilities.keySet());
        for (int i = 0; i < events.size(); i++) {
            sum += probabilities.get(events.get(i));
            if (sum > rnd)
                return Optional.of(new EventSelectionResult(events.get(Math.max(i - 1, 0))));
        }
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

        return super.select(bpss, selectableEvents);
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
}
