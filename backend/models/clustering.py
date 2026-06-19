from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
import numpy as np

def cluster_students(df_pivot, num_clusters=4, method='kmeans'):
    """
    Clusters students based on their response matrix.
    """
    # Impute missing values (e.g., with mean) to cluster
    imputer = SimpleImputer(strategy='mean')
    data_imputed = imputer.fit_transform(df_pivot)
    
    # Scale data
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data_imputed)
    
    if method == 'kmeans':
        model = KMeans(n_clusters=num_clusters, random_state=42)
    elif method == 'hierarchical':
        model = AgglomerativeClustering(n_clusters=num_clusters)
    else:
        raise ValueError("Invalid clustering method")
        
    labels = model.fit_predict(data_scaled)
    
    # Return mapping of student_id to cluster label
    return {student_id: int(label) for student_id, label in zip(df_pivot.index, labels)}
