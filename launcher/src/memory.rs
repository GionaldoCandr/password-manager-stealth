use zeroize::Zeroize;

pub struct MemoryManager;

impl MemoryManager {
    /// Merakit partisi file di RAM
    pub fn reassemble_partitions(partitions: &[Vec<u8>]) -> Vec<u8> {
        let mut reassembled = Vec::new();
        for part in partitions {
            reassembled.extend_from_slice(part);
        }
        reassembled
    }

    /// Membersihkan memori RAM yang berisi data sensitive (Zeroize)
    pub fn wipe_buffer(mut buffer: Vec<u8>) {
        buffer.zeroize();
    }
}