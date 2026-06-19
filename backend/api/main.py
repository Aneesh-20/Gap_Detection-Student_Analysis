from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import random
import sys
import os
import io

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.processor import generate_mock_data, process_responses, get_mock_question_text
from models.irt import fit_irt_model
from models.clustering import cluster_students

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Simplified for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.df_responses = None
app.state.df_questions = None
app.state.df_pivot = None
app.state.irt_results = None
app.state.clusters = None
app.state.subjects = ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry']

class QuestionCreate(BaseModel):
    topic: str
    grade: str
    type: str = "MCQ"
    text: str = ""

class SubjectCreate(BaseModel):
    name: str

class QuestionUpdate(BaseModel):
    topic: str
    grade: str
    type: str
    text: str

class GenerateRequest(BaseModel):
    topic: str

class TagRequest(BaseModel):
    text: str

def recalculate_models():
    if len(app.state.df_questions) > 0 and len(app.state.df_responses) > 0:
        app.state.df_pivot = process_responses(app.state.df_responses)
        try:
            app.state.irt_results = fit_irt_model(app.state.df_pivot)
            app.state.clusters = cluster_students(app.state.df_pivot, num_clusters=4, method='kmeans')
            
            # Merge IRT results back into questions dataframe for easy querying
            irt_diffs = dict(zip(app.state.irt_results['question_ids'], app.state.irt_results['difficulties']))
            irt_discs = dict(zip(app.state.irt_results['question_ids'], app.state.irt_results['discriminations']))
            
            app.state.df_questions['irt_difficulty'] = app.state.df_questions['question_id'].map(irt_diffs)
            app.state.df_questions['irt_discrimination'] = app.state.df_questions['question_id'].map(irt_discs)
            
            # Flag weak items
            app.state.df_questions['is_flagged'] = app.state.df_questions['irt_discrimination'] < 0.2
            
        except Exception as e:
            print(f"Error recalculating models: {e}")
            app.state.irt_results = {'abilities': np.zeros(len(app.state.df_pivot.index)), 'difficulties': np.zeros(len(app.state.df_pivot.columns)), 'discriminations': np.ones(len(app.state.df_pivot.columns)), 'student_ids': app.state.df_pivot.index.tolist(), 'question_ids': app.state.df_pivot.columns.tolist()}
            app.state.clusters = {student_id: 0 for student_id in app.state.df_pivot.index}
    else:
        app.state.df_pivot = pd.DataFrame()
        app.state.irt_results = {'abilities': [], 'difficulties': [], 'discriminations': [], 'student_ids': [], 'question_ids': []}
        app.state.clusters = {}

@app.on_event("startup")
async def startup_event():
    df_responses, df_questions = generate_mock_data(num_students=100, num_questions=50)
    app.state.df_responses = df_responses
    app.state.df_questions = df_questions
    recalculate_models()

@app.get("/api/subjects")
async def get_subjects():
    return app.state.subjects

@app.post("/api/subjects")
async def create_subject(s: SubjectCreate):
    if s.name not in app.state.subjects:
        app.state.subjects.append(s.name)
    return {"message": "Subject added", "subjects": app.state.subjects}

@app.get("/api/questions")
async def get_questions():
    if app.state.df_questions is None or len(app.state.df_questions) == 0:
        return []
    # Replace NaN with None for JSON serialization
    return app.state.df_questions.replace({np.nan: None}).to_dict(orient='records')

@app.post("/api/questions")
async def create_question(q: QuestionCreate):
    if len(app.state.df_questions) > 0:
        try:
            max_q = max([int(x.split('-')[1]) for x in app.state.df_questions['question_id'] if '-' in x])
            new_q_id = f"Q-{str(max_q + 1).zfill(3)}"
        except:
            new_q_id = f"Q-{str(len(app.state.df_questions) + 1).zfill(3)}"
    else:
        new_q_id = "Q-001"
        
    text = q.text if q.text else get_mock_question_text(q.topic)
    
    new_q = {
        'question_id': new_q_id,
        'topic': q.topic,
        'grade': q.grade,
        'type': q.type,
        'text': text,
        'difficulty_label': 'Medium',
        'true_difficulty': np.random.normal(0, 1),
        'true_discrimination': np.random.lognormal(0, 0.3)
    }
    
    app.state.df_questions = pd.concat([app.state.df_questions, pd.DataFrame([new_q])], ignore_index=True)
    
    students = app.state.df_responses['student_id'].unique() if len(app.state.df_responses) > 0 else [f'S-{str(i+1).zfill(3)}' for i in range(100)]
        
    new_responses = []
    for student_id in students:
        prob_correct = random.random()
        response = -1 if random.random() < 0.05 else (1 if random.random() < prob_correct else 0)
        new_responses.append({
            'student_id': student_id,
            'question_id': new_q_id,
            'response': response
        })
        
    app.state.df_responses = pd.concat([app.state.df_responses, pd.DataFrame(new_responses)], ignore_index=True)
    
    recalculate_models()
    return new_q

@app.put("/api/questions/{question_id}")
async def update_question(question_id: str, q: QuestionUpdate):
    idx = app.state.df_questions.index[app.state.df_questions['question_id'] == question_id].tolist()
    if not idx:
        raise HTTPException(status_code=404, detail="Question not found")
        
    app.state.df_questions.at[idx[0], 'topic'] = q.topic
    app.state.df_questions.at[idx[0], 'grade'] = q.grade
    app.state.df_questions.at[idx[0], 'type'] = q.type
    app.state.df_questions.at[idx[0], 'text'] = q.text
    
    recalculate_models()
    return {"message": "Updated"}

@app.delete("/api/questions/{question_id}")
async def delete_question(question_id: str):
    app.state.df_questions = app.state.df_questions[app.state.df_questions['question_id'] != question_id]
    app.state.df_responses = app.state.df_responses[app.state.df_responses['question_id'] != question_id]
    
    recalculate_models()
    return {"message": "Deleted"}

@app.post("/api/questions/bulk-import")
async def bulk_import_questions(file: UploadFile = File(...)):
    """
    Import questions from a CSV file.
    Expected CSV columns: text, topic, grade, type
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    contents = await file.read()
    try:
        decoded_content = contents.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded_content = contents.decode('latin-1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV file encoding not supported: {str(e)}")
            
    try:
        df_import = pd.read_csv(io.StringIO(decoded_content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    
    # Normalize headers
    df_import.columns = [col.strip().lower() for col in df_import.columns]
    
    required_cols = {'text', 'topic'}
    if not required_cols.issubset(set(df_import.columns)):
        raise HTTPException(status_code=400, detail=f"CSV must contain columns: text, topic. Found: {list(df_import.columns)}")
        
    df_import = df_import.dropna(subset=['text', 'topic'])
    if len(df_import) == 0:
        raise HTTPException(status_code=400, detail="No valid questions found in the CSV (missing 'text' or 'topic' values)")
        
    # Fill optional columns with defaults
    if 'grade' not in df_import.columns:
        df_import['grade'] = 'Grade 9'
    else:
        df_import['grade'] = df_import['grade'].fillna('Grade 9')
        
    if 'type' not in df_import.columns:
        df_import['type'] = 'MCQ'
    else:
        df_import['type'] = df_import['type'].fillna('MCQ')
    
    # Get current max question id
    try:
        max_q = max([int(x.split('-')[1]) for x in app.state.df_questions['question_id'] if '-' in x])
    except:
        max_q = 0
    
    students = app.state.df_responses['student_id'].unique() if app.state.df_responses is not None and len(app.state.df_responses) > 0 else [f'S-{str(i+1).zfill(3)}' for i in range(100)]
    
    imported = []
    all_new_responses = []
    
    for _, row in df_import.iterrows():
        max_q += 1
        new_q_id = f"Q-{str(max_q).zfill(3)}"
        
        diff = np.random.normal(0, 1)
        diff_label = 'Hard' if diff > 0.5 else ('Easy' if diff < -0.5 else 'Medium')
        
        new_q = {
            'question_id': new_q_id,
            'text': str(row['text']).strip(),
            'topic': str(row['topic']).strip(),
            'grade': str(row['grade']).strip(),
            'type': str(row['type']).strip(),
            'difficulty_label': diff_label,
            'true_difficulty': diff,
            'true_discrimination': np.random.lognormal(0, 0.3)
        }
        imported.append(new_q)
        
        # Add subject if new
        if new_q['topic'] not in app.state.subjects:
            app.state.subjects.append(new_q['topic'])
        
        # Generate mock responses
        for student_id in students:
            prob = random.random()
            resp = -1 if random.random() < 0.05 else (1 if random.random() < prob else 0)
            all_new_responses.append({
                'student_id': student_id,
                'question_id': new_q_id,
                'response': resp
            })
    
    app.state.df_questions = pd.concat([app.state.df_questions, pd.DataFrame(imported)], ignore_index=True)
    app.state.df_responses = pd.concat([app.state.df_responses, pd.DataFrame(all_new_responses)], ignore_index=True)
    
    recalculate_models()
    
    return {"message": f"Successfully imported {len(imported)} questions", "count": len(imported)}

@app.post("/api/responses/bulk-import")
async def bulk_import_responses(file: UploadFile = File(...)):
    """
    Import student responses from a CSV file.
    Supports:
    - Transactional format: student_id, question_id, response
    - Matrix format: student_id as first column, questions as subsequent columns
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    contents = await file.read()
    try:
        decoded_content = contents.decode('utf-8')
    except UnicodeDecodeError:
        try:
            decoded_content = contents.decode('latin-1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV file encoding not supported: {str(e)}")
            
    try:
        df_import = pd.read_csv(io.StringIO(decoded_content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
        
    df_import = df_import.dropna(how='all')
    if len(df_import) == 0:
        raise HTTPException(status_code=400, detail="CSV file is empty")
        
    orig_cols = list(df_import.columns)
    normalized_cols = [str(c).strip().lower() for c in orig_cols]
    df_import.columns = normalized_cols
    
    # Identify key columns
    student_col = None
    question_col = None
    response_col = None
    
    for col in normalized_cols:
        if col in ['student_id', 'studentid', 'student', 'student id', 's_idx']:
            student_col = col
            break
    for col in normalized_cols:
        if col in ['question_id', 'questionid', 'question', 'question id', 'q_idx']:
            question_col = col
            break
    for col in normalized_cols:
        if col in ['response', 'score', 'correct', 'value', 'answer']:
            response_col = col
            break
            
    is_transactional = (student_col is not None) and (question_col is not None) and (response_col is not None)
    
    new_responses = []
    imported_student_ids = set()
    imported_question_ids = set()
    
    if is_transactional:
        df_valid = df_import.dropna(subset=[student_col, question_col])
        for _, row in df_valid.iterrows():
            s_id = str(row[student_col]).strip()
            q_id = str(row[question_col]).strip()
            if not s_id or not q_id:
                continue
                
            raw_resp = row[response_col]
            if pd.isna(raw_resp) or str(raw_resp).strip() == '' or str(raw_resp).strip().lower() in ['nan', 'none', '-1', 'null']:
                resp_val = -1
            else:
                try:
                    resp_val = int(float(raw_resp))
                    if resp_val not in [0, 1]:
                        resp_val = 1 if resp_val > 0 else 0
                except ValueError:
                    val_str = str(raw_resp).strip().lower()
                    if val_str in ['1', 'correct', 'true', 'yes', 'y', 'pass']:
                        resp_val = 1
                    elif val_str in ['0', 'incorrect', 'false', 'no', 'n', 'fail']:
                        resp_val = 0
                    else:
                        resp_val = -1
                        
            new_responses.append({
                'student_id': s_id,
                'question_id': q_id,
                'response': resp_val
            })
            imported_student_ids.add(s_id)
            imported_question_ids.add(q_id)
    else:
        # Matrix format
        if student_col is None:
            student_col = normalized_cols[0]
            
        if len(normalized_cols) < 2:
            raise HTTPException(
                status_code=400,
                detail="CSV must contain a student identifier and at least one question column (matrix format) or student_id, question_id, response columns (transactional format)"
            )
            
        question_columns = [col for col in df_import.columns if col != student_col]
        col_map = {norm: orig for norm, orig in zip(normalized_cols, orig_cols)}
        
        for _, row in df_import.iterrows():
            s_id = str(row[student_col]).strip()
            if pd.isna(s_id) or s_id == '':
                continue
            imported_student_ids.add(s_id)
            
            for q_norm in question_columns:
                q_id = col_map[q_norm].strip()
                imported_question_ids.add(q_id)
                
                raw_resp = row[q_norm]
                if pd.isna(raw_resp) or str(raw_resp).strip() == '' or str(raw_resp).strip().lower() in ['nan', 'none', '-1', 'null']:
                    resp_val = -1
                else:
                    try:
                        resp_val = int(float(raw_resp))
                        if resp_val not in [0, 1]:
                            resp_val = 1 if resp_val > 0 else 0
                    except ValueError:
                        val_str = str(raw_resp).strip().lower()
                        if val_str in ['1', 'correct', 'true', 'yes', 'y', 'pass']:
                            resp_val = 1
                        elif val_str in ['0', 'incorrect', 'false', 'no', 'n', 'fail']:
                            resp_val = 0
                        else:
                            resp_val = -1
                            
                new_responses.append({
                    'student_id': s_id,
                    'question_id': q_id,
                    'response': resp_val
                })
                
    if not new_responses:
        raise HTTPException(status_code=400, detail="No valid response records found in the CSV")
        
    df_new_responses = pd.DataFrame(new_responses)
    
    # Auto-create missing questions
    existing_questions = set(app.state.df_questions['question_id'].values) if app.state.df_questions is not None else set()
    missing_questions = imported_question_ids - existing_questions
    
    new_questions = []
    if missing_questions:
        default_topic = "Imported"
        if default_topic not in app.state.subjects:
            app.state.subjects.append(default_topic)
            
        for q_id in sorted(list(missing_questions)):
            diff = np.random.normal(0, 1)
            diff_label = 'Hard' if diff > 0.5 else ('Easy' if diff < -0.5 else 'Medium')
            new_q = {
                'question_id': q_id,
                'text': f"Imported question {q_id}",
                'topic': default_topic,
                'grade': 'Grade 9',
                'type': 'MCQ',
                'difficulty_label': diff_label,
                'true_difficulty': diff,
                'true_discrimination': np.random.lognormal(0, 0.3)
            }
            new_questions.append(new_q)
            
        if new_questions:
            app.state.df_questions = pd.concat([app.state.df_questions, pd.DataFrame(new_questions)], ignore_index=True)
            
    # Merge/upsert imported responses into state
    if app.state.df_responses is not None and len(app.state.df_responses) > 0:
        existing_keys = app.state.df_responses['student_id'] + ":::" + app.state.df_responses['question_id']
        new_keys = df_new_responses['student_id'] + ":::" + df_new_responses['question_id']
        app.state.df_responses = pd.concat([
            app.state.df_responses[~existing_keys.isin(new_keys)],
            df_new_responses
        ], ignore_index=True)
    else:
        app.state.df_responses = df_new_responses
        
    recalculate_models()
    
    return {
        "message": f"Successfully imported {len(df_new_responses)} response(s) for {len(imported_student_ids)} student(s) and {len(imported_question_ids)} question(s)",
        "responses_count": len(df_new_responses),
        "students_count": len(imported_student_ids),
        "questions_count": len(imported_question_ids),
        "new_questions_created": len(new_questions)
    }

@app.post("/api/smart/generate")
async def generate_question(req: GenerateRequest):
    """Mock LLM endpoint"""
    return {"text": get_mock_question_text(req.topic), "type": "MCQ"}

@app.post("/api/smart/tag")
async def tag_question(req: TagRequest):
    """Mock ML classifier"""
    text = req.text.lower()
    if 'area' in text or 'circle' in text or 'triangle' in text: return {"topic": "Geometry"}
    if 'integral' in text or 'derivative' in text or 'limit' in text: return {"topic": "Calculus"}
    if 'mean' in text or 'probability' in text: return {"topic": "Statistics"}
    if 'sin' in text or 'cos' in text or 'tan' in text: return {"topic": "Trigonometry"}
    return {"topic": "Algebra"}

@app.get("/api/data")
async def get_data():
    if app.state.df_questions is None or len(app.state.df_questions) == 0:
        return {'heatmap': [], 'radar': [], 'questions': [], 'irt_difficulties': []}
        
    questions_list = app.state.df_questions.replace({np.nan: None}).to_dict(orient='records')
    
    heatmap_data = []
    if app.state.df_responses is not None and len(app.state.df_responses) > 0:
        for _, row in app.state.df_responses.iterrows():
            q_id = row['question_id']
            if q_id not in app.state.df_questions['question_id'].values: continue
            
            student_id = row['student_id']
            q_info = app.state.df_questions[app.state.df_questions['question_id'] == q_id].iloc[0]
            
            try:
                ability_index = app.state.irt_results['student_ids'].index(student_id)
                ability = app.state.irt_results['abilities'][ability_index]
            except:
                ability = 0
                
            heatmap_data.append({
                'student_id': student_id,
                'question_id': q_id,
                'response': None if pd.isna(row['response']) or row['response'] == -1 else row['response'],
                'topic': q_info['topic'],
                'grade': q_info['grade'],
                'cluster': app.state.clusters.get(student_id, 0),
                'ability': ability
            })
            
    radar_data = {}
    if app.state.df_responses is not None and len(app.state.df_responses) > 0:
        for _, row in app.state.df_responses.iterrows():
            student_id = row['student_id']
            q_id = row['question_id']
            
            if q_id not in app.state.df_questions['question_id'].values: continue
            topic = app.state.df_questions[app.state.df_questions['question_id'] == q_id].iloc[0]['topic']
            
            if student_id not in radar_data: radar_data[student_id] = {}
            if topic not in radar_data[student_id]: radar_data[student_id][topic] = {'correct': 0, 'total': 0}
                
            resp = row['response']
            radar_data[student_id][topic]['correct'] += 0 if pd.isna(resp) or resp == -1 else resp
            radar_data[student_id][topic]['total'] += 1
            
    formatted_radar_data = []
    for student_id, topics in radar_data.items():
        skills = [{'topic': t, 'score': c['correct']/c['total'] if c['total']>0 else 0} for t, c in topics.items()]
        formatted_radar_data.append({'student_id': student_id, 'cluster': app.state.clusters.get(student_id, 0), 'skills': skills})

    return {
        'heatmap': heatmap_data,
        'radar': formatted_radar_data,
        'questions': questions_list
    }
