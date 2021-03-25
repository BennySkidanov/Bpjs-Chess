package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListenerAdapter;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;

public class Explanations extends BProgramRunnerListenerAdapter {
    @Override
    public void eventSelected(BProgram bp, BEvent e) {
        if(e.name.equals("Move") || e.name.equals("Explanation")) {
            System.out.println(e.toString());
        }
    }
}
