package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.context.ContextBProgram;
import il.ac.bgu.cs.bp.bpjs.context.PrintCOBProgramRunnerListener;
import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.jsproxy.BpLog;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static il.ac.bgu.cs.bp.bpjs.context.PrintCOBProgramRunnerListener.Level;

public class Main {
  private static String pgn="";

  public static void main(final String[] args) throws InterruptedException {

    /** Choose the desired COBP program... */
    BProgram bprog = new ContextBProgram("dal.js", "bl.js");
//    BProgram bprog = new ContextBProgram("chess/dal.js", "chess/bl.js");

    bprog.setWaitForExternalEvents(true);
    final BProgramRunner rnr = new BProgramRunner(bprog);

    /** internal context events are: "CTX.Changed", "_____CTX_LOCK_____", "_____CTX_RELEASE_____"
     * You can filter these event from printing on console using the Level:
     * Level.ALL : print all
     * Level.NONE : print none
     * Level.CtxChanged: print only CTX.Changed events (i.e., filter the transaction lock/release events)
     */
/*//    rnr.addListener(new PrintCOBProgramRunnerListener(Level.CtxChanged));
    rnr.addListener(new Explanations());
    bprog.setLogLevel(BpLog.LogLevel.Warn);
    Thread t = new Thread(rnr);
    t.start();
    //simulateGameFromPgn(bprog, pgn);
    //simulateGame(bprog);
    rnr.run();
    t.join();*/

    rnr.addListener(new PrintCOBProgramRunnerListener(Level.CtxChanged));
    rnr.run();
  }

  private static void simulateGame(BProgram bprog) {
    List<BEvent> moves = List.of(
//            move("a2","a4"),
//            move("b7","b6")
//            move("a4", "a5"),
//            move("e7", "e5"),
//            move("e2", "e4"),
//            move("d7", "d5"),
//            move("e4", "d5"),
//            move("c7", "c5"),
//            move("d5", "d6")
    );
    moves.forEach(bprog::enqueueExternalEvent);
  }

  private static BEvent move(String src, String dst) {
    return new BEvent("Move", Map.of("dst",dst , "src",src));
  }

  private static void simulateGameFromPgn(BProgram bprog, String pgn) {
    // Arrays.stream(pgn.split(" ")).map(m -> move(m.substring(0,2),m.substring(2))).forEach(bprog::enqueueExternalEvent);
    //    // movesList = translateFromPGN(pgn)
  }
}
