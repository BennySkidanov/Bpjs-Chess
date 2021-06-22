package il.ac.bgu.cs.bp.chess.eventSets;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSet;

import java.util.Map;
import java.util.NoSuchElementException;

public class DevelopBishops implements EventSet {
    @Override
    public boolean contains(BEvent bEvent) {
        if (bEvent.name.equals("Move") && bEvent.maybeData != null) {
            try {
                Map<String, Object> eData = (Map<String, Object>) bEvent.getDataField().get();
                if (!(eData.get("piece").equals("Bishop"))) return false;
                var destinationCell = eData.get("dst");
                return (destinationCell.toString().charAt(1) == '2' ||destinationCell.toString().charAt(1) == '3' ||
                        destinationCell.toString().charAt(1) == '4' || destinationCell.toString().charAt(1) == '5');
            } catch (NoSuchElementException e) {
                return false;
            }
        }
        return false;
    }
}
